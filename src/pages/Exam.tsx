// src/pages/Exam.tsx
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, 
  CameraOff, 
  AlertTriangle, 
  X, 
  Clock,
  Wifi,
  Shield,
  Eye,
  Users,
  Smartphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { aiDetectionService, type ViolationAlert, type DetectionResult } from '@/utils/aiDetection';
import { AiViolationHistory } from '@/components/ui/ai-violation-history';

const MONITOR_INTERVAL_MS = 2000; // faster, more responsive. Change to 3000 if needed.

const Exam = () => {
  const { user, profile, loading } = useAuth();
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [showViolationWarning, setShowViolationWarning] = useState(false);
  const [examSession, setExamSession] = useState<any>(null);
  const [isExamLocked, setIsExamLocked] = useState(false);
  const [examStartTime, setExamStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  // AI Detection states
  const [aiDetectionResult, setAiDetectionResult] = useState<DetectionResult | null>(null);
  const [aiViolations, setAiViolations] = useState<ViolationAlert[]>([]);
  const [isAiInitialized, setIsAiInitialized] = useState(false);
  const [detectedObjects, setDetectedObjects] = useState<Array<{type: 'person' | 'device', x: number, y: number, width: number, height: number, confidence: number}>>([]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const monitorIntervalRef = useRef<number | null>(null);

  const navigate = useNavigate();
  const { toast } = useToast();

  const MAX_TAB_SWITCHES = 3;
  const MAX_AI_VIOLATIONS = 5;
  const [aiViolationCount, setAiViolationCount] = useState(0);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Initialize camera
  useEffect(() => {
    let cancelled = false;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          },
          audio: false
        });
        
        if (cancelled) {
          // if the component unmounted while awaiting permission
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        setCameraStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        
        toast({
          title: "Camera activated",
          description: "Your webcam is now being monitored",
        });

        // Initialize AI detection after camera is ready
        initializeAiDetection();
      } catch (error) {
        setCameraError('Unable to access camera. Please ensure camera permissions are granted.');
        toast({
          title: "Camera error",
          description: "Failed to access your camera. Please check permissions.",
          variant: "destructive",
        });
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      // Clear monitoring interval if exists
      if (monitorIntervalRef.current) {
        clearInterval(monitorIntervalRef.current);
        monitorIntervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount only

  // Create exam session
  useEffect(() => {
    const createExamSession = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('exam_sessions')
          .insert({
            user_id: user.id,
            started_at: new Date().toISOString(),
            tab_switches: 0,
            max_tab_switches: MAX_TAB_SWITCHES,
            is_active: true,
            violation_count: 0
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating exam session:', error);
          return;
        }

        setExamSession(data);
        setExamStartTime(new Date());
      } catch (error) {
        console.error('Error creating exam session:', error);
      }
    };

    if (user && !examSession) {
      createExamSession();
    }
  }, [user, examSession]);

  // Initialize AI Detection
  const initializeAiDetection = async () => {
    try {
      await aiDetectionService.initialize();
      setIsAiInitialized(true);
      
      toast({
        title: "AI Monitoring Active",
        description: "Person and device detection enabled",
      });
    } catch (error) {
      console.error('Failed to initialize AI detection:', error);
      toast({
        title: "AI Detection Warning",
        description: "AI monitoring failed to initialize, basic monitoring active",
        variant: "destructive",
      });
    }
  };

  // AI Monitoring Loop (runs while initialized and not locked)
  useEffect(() => {
    if (!isAiInitialized || !videoRef.current || isExamLocked) {
      if (monitorIntervalRef.current) {
        clearInterval(monitorIntervalRef.current);
        monitorIntervalRef.current = null;
      }
      return;
    }

    const videoEl = videoRef.current;

    const tick = async () => {
      try {
        // 1) Analyze violations (smoothed + rate-limited)
        const violations = await aiDetectionService.analyzeForViolations(videoEl);

        if (violations.length > 0) {
          setAiViolations(prev => [...prev, ...violations]);

          setAiViolationCount(prev => {
            const updatedCount = prev + violations.length;

            // Progressive warnings + termination logic
            (async () => {
              for (const violation of violations) {
                const progressMessage = `${violation.message} (AI Violation ${updatedCount}/${MAX_AI_VIOLATIONS})`;
                await sendEmailAlert(progressMessage);

                if (updatedCount >= MAX_AI_VIOLATIONS) {
                  // Terminate exam
                  setIsExamLocked(true);
                  await sendEmailAlert('Exam terminated - Maximum AI violations exceeded');
                  toast({
                    title: "Exam Terminated - AI Violations",
                    description: `Too many AI violations detected. Your exam has been terminated.`,
                    variant: "destructive",
                  });
                  setTimeout(() => {
                    handleEndExam();
                  }, 5000);
                } else if (updatedCount >= MAX_AI_VIOLATIONS - 1) {
                  toast({
                    title: "FINAL WARNING - AI Detection",
                    description: `${violation.type === 'multiple_persons' ? 'Multiple people' : 'Device'} detected! One more violation will end your exam.`,
                    variant: "destructive",
                  });
                } else if (updatedCount >= MAX_AI_VIOLATIONS - 2) {
                  toast({
                    title: "SERIOUS WARNING - AI Detection",
                    description: `${violation.type === 'multiple_persons' ? 'Multiple people' : 'Device'} detected! ${MAX_AI_VIOLATIONS - updatedCount} violations remaining.`,
                    variant: "destructive",
                  });
                } else {
                  toast({
                    title: violation.type === 'multiple_persons' ? "Multiple People Detected!" : "Device Detected!",
                    description: `${violation.message} (${MAX_AI_VIOLATIONS - updatedCount} violations remaining)`,
                    variant: "destructive",
                  });
                }
              }

              // Update violation count in database
              await updateViolationCount(violations.length);
            })();
            return updatedCount;
          });
        }

        // 2) Update detection result for UI display (cheap due to caching)
        const result = await aiDetectionService.detectViolations(videoEl);
        setAiDetectionResult(result);
        
        if (result.detectedObjects) {
          setDetectedObjects(result.detectedObjects);
        }
      } catch (error) {
        console.error('AI monitoring error:', error);
      }
    };

    // run immediately, then at interval
    tick();
    monitorIntervalRef.current = window.setInterval(tick, MONITOR_INTERVAL_MS) as unknown as number;

    return () => {
      if (monitorIntervalRef.current) {
        clearInterval(monitorIntervalRef.current);
        monitorIntervalRef.current = null;
      }
    };
  }, [isAiInitialized, isExamLocked, MAX_AI_VIOLATIONS]);

  // Update violation count in database
  const updateViolationCount = async (newViolations: number) => {
    if (!examSession) return;

    try {
      const { error } = await supabase
        .from('exam_sessions')
        .update({ 
          violation_count: (examSession.violation_count || 0) + newViolations 
        })
        .eq('id', examSession.id);

      if (error) {
        console.error('Error updating violation count:', error);
      } else {
        setExamSession(prev => ({
          ...prev,
          violation_count: (prev.violation_count || 0) + newViolations
        }));
      }
    } catch (error) {
      console.error('Error updating violation count:', error);
    }
  };

  // Send email alert for violations
  const sendEmailAlert = async (activity: string) => {
    if (!profile) return;

    try {
      const violationData = {
        studentName: profile.full_name,
        prn: profile.prn,
        activity,
        timestamp: new Date().toISOString()
      };

      const { data, error } = await supabase.functions.invoke('send-email-alert', {
        body: violationData
      });

      if (error || !data?.success) {
        console.error('Email alert failed:', error || data);
        toast({
          title: "Alert Error",
          description: data?.hint ?? data?.message ?? "Failed to send violation alert to teachers",
          variant: "destructive",
        });
      } else {
        console.log('Email alert sent successfully:', data);
        toast({
          title: "Teachers Notified",
          description: data?.message ?? "Violation alert sent via email",
        });
      }
    } catch (error) {
      console.error('Failed to send email alert:', error);
      toast({
        title: "Alert Error",
        description: "Failed to send violation alert",
        variant: "destructive",
      });
    }
  };

  // Tab switch detection
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden && !isExamLocked) {
        const newTabSwitches = tabSwitches + 1;
        setTabSwitches(newTabSwitches);
        setShowViolationWarning(true);

        // Send email alert
        await sendEmailAlert(`Tab switched (${newTabSwitches}/${MAX_TAB_SWITCHES})`);

        // Update exam session in database
        if (examSession) {
          try {
            await supabase
              .from('exam_sessions')
              .update({
                tab_switches: newTabSwitches,
                violation_count: newTabSwitches
              })
              .eq('id', examSession.id);
          } catch (error) {
            console.error('Error updating exam session:', error);
          }
        }

        if (newTabSwitches >= MAX_TAB_SWITCHES) {
          setIsExamLocked(true);
          await sendEmailAlert('Exam terminated - Maximum tab switches exceeded');
          toast({
            title: "Exam terminated",
            description: "You have exceeded the maximum number of tab switches.",
            variant: "destructive",
          });
          setTimeout(() => {
            handleEndExam();
          }, 5000);
        } else {
          toast({
            title: `Tab switch detected (${newTabSwitches}/${MAX_TAB_SWITCHES})`,
            description: `Warning: ${MAX_TAB_SWITCHES - newTabSwitches} violations remaining`,
            variant: "destructive",
          });
        }

        // Auto-hide warning after 5 seconds
        setTimeout(() => {
          setShowViolationWarning(false);
        }, 5000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [tabSwitches, examSession, isExamLocked, profile]);

  // Window blur detection
  useEffect(() => {
    const handleWindowBlur = async () => {
      if (!isExamLocked) {
        await sendEmailAlert('Window lost focus - Potential cheating detected');
        toast({
          title: "Window unfocus detected",
          description: "Please keep the exam window focused",
          variant: "destructive",
        });
      }
    };

    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [isExamLocked, profile]);

  // Timer
  useEffect(() => {
    if (!examStartTime) return;

    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - examStartTime.getTime()) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [examStartTime]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndExam = async () => {
    if (examSession) {
      try {
        await supabase
          .from('exam_sessions')
          .update({
            ended_at: new Date().toISOString(),
            is_active: false
          })
          .eq('id', examSession.id);
      } catch (error) {
        console.error('Error ending exam session:', error);
      }
    }

    // Stop camera
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }

    // Stop monitoring
    if (monitorIntervalRef.current) {
      clearInterval(monitorIntervalRef.current);
      monitorIntervalRef.current = null;
    }

    toast({
      title: "Exam ended",
      description: "Your exam session has been successfully terminated.",
    });

    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-animated">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-background/90" />
      
      {/* Violation Warning Overlay */}
      <AnimatePresence>
        {showViolationWarning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-destructive/20 backdrop-blur-sm z-50 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-card border border-destructive p-8 rounded-lg shadow-2xl max-w-md mx-4"
            >
              <div className="text-center space-y-4">
                <AlertTriangle className="h-16 w-16 text-destructive mx-auto animate-pulse" />
                <h3 className="text-xl font-bold text-destructive">
                  Tab Switch Detected!
                </h3>
                <p className="text-muted-foreground">
                  Violation {tabSwitches} of {MAX_TAB_SWITCHES}
                </p>
                <p className="text-sm text-muted-foreground">
                  {MAX_TAB_SWITCHES - tabSwitches > 0 
                    ? `${MAX_TAB_SWITCHES - tabSwitches} violations remaining`
                    : "Exam will be terminated"
                  }
                </p>
                <Button
                  onClick={() => setShowViolationWarning(false)}
                  variant="outline"
                  className="mt-4"
                >
                  <X className="h-4 w-4 mr-2" />
                  Acknowledge
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exam Locked Overlay */}
      <AnimatePresence>
        {isExamLocked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-destructive/30 backdrop-blur-sm z-40 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-card border border-destructive p-8 rounded-lg shadow-2xl max-w-md mx-4 text-center"
            >
              <Shield className="h-16 w-16 text-destructive mx-auto mb-4" />
              <h3 className="text-xl font-bold text-destructive mb-2">
                Exam Terminated
              </h3>
              <p className="text-muted-foreground mb-6">
                You have exceeded the maximum number of allowed tab switches. 
                Your exam session has been terminated.
              </p>
              <Button
                onClick={handleEndExam}
                variant="destructive"
                className="w-full"
              >
                Return to Dashboard
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 border-b border-border/10 backdrop-blur-sm bg-background/80"
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-gradient-primary">
                <Eye className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">
                  Live Exam Session
                </h1>
                <p className="text-sm text-muted-foreground">
                  {profile.full_name} • {profile.prn}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Badge variant={tabSwitches >= MAX_TAB_SWITCHES ? "destructive" : "secondary"}>
                Violations: {tabSwitches}/{MAX_TAB_SWITCHES}
              </Badge>
              
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                {formatTime(elapsedTime)}
              </div>
              
              <Button
                onClick={handleEndExam}
                variant="destructive"
                size="sm"
                disabled={isExamLocked}
              >
                End Exam
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Camera Feed */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2"
          >
            <Card className="glass border-0 shadow-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5 text-primary" />
                  Live Camera Feed
                </CardTitle>
                <CardDescription>
                  Your webcam is being monitored for exam integrity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                  {cameraError ? (
                    <div className="absolute inset-0 flex items-center justify-center text-center p-4">
                      <div className="space-y-2">
                        <CameraOff className="h-12 w-12 text-muted-foreground mx-auto" />
                        <p className="text-sm text-muted-foreground">{cameraError}</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      
                      {/* Detection Overlay */}
                      {detectedObjects.length > 0 && (
                        <div className="absolute inset-0 pointer-events-none">
                          {detectedObjects.map((obj, index) => {
                            // Scale coordinates to match video display size
                            const videoElement = videoRef.current;
                            if (!videoElement) return null;
                            
                            const scaleX = videoElement.clientWidth / videoElement.videoWidth;
                            const scaleY = videoElement.clientHeight / videoElement.videoHeight;
                            
                            const scaledX = obj.x * scaleX;
                            const scaledY = obj.y * scaleY;
                            const scaledWidth = obj.width * scaleX;
                            const scaledHeight = obj.height * scaleY;
                            
                            return (
                              <div
                                key={`${obj.type}-${index}`}
                                className={`absolute border-2 rounded ${
                                  obj.type === 'person'
                                    ? obj.confidence > 0.8
                                      ? 'border-green-400'
                                      : 'border-yellow-400'
                                    : 'border-red-500'
                                } bg-black/20 backdrop-blur-sm`}
                                style={{
                                  left: `${scaledX}px`,
                                  top: `${scaledY}px`,
                                  width: `${scaledWidth}px`,
                                  height: `${scaledHeight}px`,
                                }}
                              >
                                <div className={`absolute -top-6 left-0 px-2 py-1 rounded text-xs font-medium ${
                                  obj.type === 'person'
                                    ? obj.confidence > 0.8
                                      ? 'bg-green-500 text-white'
                                      : 'bg-yellow-500 text-black'
                                    : 'bg-red-500 text-white'
                                }`}>
                                  {obj.type === 'person' ? '👤 Person' : '📱 Device'} ({Math.round(obj.confidence * 100)}%)
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                  
                  {/* Recording indicator */}
                  <div className="absolute top-4 left-4 flex items-center gap-2 bg-destructive/90 text-destructive-foreground px-3 py-1 rounded-full text-sm">
                    <div className="w-2 h-2 bg-current rounded-full animate-pulse" />
                    RECORDING
                  </div>
                  
                  {/* AI Status */}
                  <div className="absolute top-4 right-4 flex items-center gap-2 bg-success/90 text-success-foreground px-3 py-1 rounded-full text-sm">
                    <Wifi className="h-3 w-3" />
                    AI MONITORING
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Monitoring Panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            {/* Session Status */}
            <Card className="glass border-0 shadow-accent">
              <CardHeader>
                <CardTitle className="text-lg">Session Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant={isExamLocked ? "destructive" : "default"}>
                    {isExamLocked ? "Terminated" : "Active"}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Duration</span>
                  <span className="text-sm font-medium">{formatTime(elapsedTime)}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Camera</span>
                  <Badge variant={cameraStream ? "default" : "destructive"}>
                    {cameraStream ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* AI Detection Status */}
            <Card className="glass border-0 shadow-accent">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  AI Detection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant={isAiInitialized ? "default" : "secondary"}>
                    {isAiInitialized ? "Active" : "Initializing"}
                  </Badge>
                </div>
                
                {aiDetectionResult && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        People Count
                      </span>
                      <Badge variant={aiDetectionResult.personCount > 1 ? "destructive" : "default"}>
                        {aiDetectionResult.personCount}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Smartphone className="h-3 w-3" />
                        Device Detected
                      </span>
                      <Badge variant={aiDetectionResult.deviceDetected ? "destructive" : "default"}>
                        {aiDetectionResult.deviceDetected ? "Yes" : "No"}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Confidence</span>
                      <span className="text-sm font-medium">
                        {Math.round(aiDetectionResult.confidence * 100)}%
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Violation Tracker */}
            <Card className="glass border-0 shadow-warning">
              <CardHeader>
                <CardTitle className="text-lg">Violation Tracker</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Tab Switches</span>
                  <Badge variant={tabSwitches >= MAX_TAB_SWITCHES ? "destructive" : "secondary"}>
                    {tabSwitches}/{MAX_TAB_SWITCHES}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">AI Violations</span>
                  <Badge variant={aiViolationCount >= MAX_AI_VIOLATIONS ? "destructive" : aiViolationCount > 0 ? "destructive" : "default"}>
                    {aiViolationCount}/{MAX_AI_VIOLATIONS}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Violations</span>
                  <Badge variant={(examSession?.violation_count || 0) + tabSwitches + aiViolationCount > 0 ? "destructive" : "default"}>
                    {(examSession?.violation_count || 0) + tabSwitches + aiViolationCount}
                  </Badge>
                </div>
                
                {/* Tab Switch Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Tab Switches</span>
                    <span>{tabSwitches}/{MAX_TAB_SWITCHES}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        tabSwitches >= MAX_TAB_SWITCHES 
                          ? 'bg-destructive' 
                          : tabSwitches > 1 
                          ? 'bg-warning' 
                          : 'bg-success'
                      }`}
                      style={{ width: `${(tabSwitches / MAX_TAB_SWITCHES) * 100}%` }}
                    />
                  </div>
                </div>
                
                {/* AI Violations Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>AI Violations</span>
                    <span>{aiViolationCount}/{MAX_AI_VIOLATIONS}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        aiViolationCount >= MAX_AI_VIOLATIONS 
                          ? 'bg-destructive' 
                          : aiViolationCount >= MAX_AI_VIOLATIONS - 1
                          ? 'bg-destructive' 
                          : aiViolationCount > 1 
                          ? 'bg-warning' 
                          : 'bg-success'
                      }`}
                      style={{ width: `${(aiViolationCount / MAX_AI_VIOLATIONS) * 100}%` }}
                    />
                  </div>
                </div>
                
                <Alert className={tabSwitches >= 2 || aiViolationCount >= MAX_AI_VIOLATIONS - 1 ? "border-destructive" : ""}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {(tabSwitches === 0 && aiViolationCount === 0) && "Stay focused! No violations detected."}
                    {(tabSwitches === 1 && aiViolationCount <= 2) && "Warning: Avoid switching tabs and maintain proper exam conditions."}
                    {(tabSwitches === 2 || aiViolationCount >= MAX_AI_VIOLATIONS - 2) && "Serious warning: Multiple violations detected."}
                    {(tabSwitches >= 3 || aiViolationCount >= MAX_AI_VIOLATIONS) && "Exam terminated due to excessive violations."}
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* AI Monitoring */}
            <Card className="glass border-0 shadow-glow">
              <CardHeader>
                <CardTitle className="text-lg">AI Monitoring</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <div className={`w-2 h-2 rounded-full ${isAiInitialized ? 'bg-success animate-pulse' : 'bg-muted'}`} />
                  <span className="text-muted-foreground">Person Detection: {isAiInitialized ? 'Active' : 'Initializing'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className={`w-2 h-2 rounded-full ${isAiInitialized ? 'bg-success animate-pulse' : 'bg-muted'}`} />
                  <span className="text-muted-foreground">Device Detection: {isAiInitialized ? 'Active' : 'Initializing'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                  <span className="text-muted-foreground">Tab Monitoring: Enabled</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                  <span className="text-muted-foreground">Email Alerts: Active</span>
                </div>
              </CardContent>
            </Card>

            {/* AI Violation History */}
            <AiViolationHistory violations={aiViolations} />
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Exam;
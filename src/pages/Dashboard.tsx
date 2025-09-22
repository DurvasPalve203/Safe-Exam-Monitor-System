import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Camera, LogOut, User, Shield, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const Dashboard = () => {
  const { user, profile, signOut, loading, profileLoading } = useAuth();
  const [isExamStarted, setIsExamStarted] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const handleStartExam = () => {
    setIsExamStarted(true);
    navigate('/exam');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading || profileLoading) {
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

  if (!user) {
    return null;
  }

  // Show profile creation prompt if profile doesn't exist
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-animated p-4">
        <Card className="glass border-0 shadow-primary max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Profile Setup Required</CardTitle>
            <CardDescription>
              Your profile hasn't been created yet. Please contact support or try signing out and back in.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={handleSignOut}
              className="w-full"
              variant="outline"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out & Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 gradient-animated-alt opacity-30" />
      
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 border-b border-border/10 backdrop-blur-sm"
      >
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-lg bg-gradient-primary glow-primary">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Exam Portal
              </h1>
              <p className="text-sm text-muted-foreground">
                AI-Powered Monitoring System
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="glass hover-scale"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Welcome Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <h2 className="text-3xl font-bold text-foreground mb-2">
              Welcome back, {profile.full_name}
            </h2>
            <p className="text-muted-foreground">
              Ready to start your monitored examination session
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Profile Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="glass border-0 shadow-primary hover-scale">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Student Profile
                  </CardTitle>
                  <CardDescription>
                    Your registered information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Full Name
                      </label>
                      <p className="text-sm font-medium">{profile.full_name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        PRN
                      </label>
                      <p className="text-sm font-medium">{profile.prn}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      VIT Email
                    </label>
                    <p className="text-sm font-medium">{profile.vit_email}</p>
                  </div>
                  <Badge variant="secondary" className="w-fit">
                    Verified Student
                  </Badge>
                </CardContent>
              </Card>
            </motion.div>

            {/* Exam Portal Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="glass border-0 shadow-accent hover-scale">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5 text-accent" />
                    Exam Session
                  </CardTitle>
                  <CardDescription>
                    Start your monitored examination
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-success rounded-full" />
                      <span className="text-muted-foreground">System Status: Ready</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                      <span className="text-muted-foreground">Camera: Available</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-warning rounded-full" />
                      <span className="text-muted-foreground">Tab Monitoring: Active</span>
                    </div>
                  </div>
                  
                  <Button
                    onClick={handleStartExam}
                    className="btn-accent w-full"
                    size="lg"
                  >
                    <Camera className="h-5 w-5 mr-2" />
                    Start Exam
                  </Button>
                  
                  <Button
                    onClick={() => navigate('/teachers')}
                    variant="outline"
                    className="w-full glass"
                    size="lg"
                  >
                    <User className="h-5 w-5 mr-2" />
                    Manage Teachers
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* System Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-8"
          >
            <Card className="glass border-0 shadow-glow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  Important Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <h4 className="font-medium text-foreground">Monitoring Features</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Live webcam monitoring throughout the exam</li>
                      <li>• Tab switch detection with 3-violation limit</li>
                      <li>• AI-powered behavior analysis</li>
                      <li>• Real-time violation alerts</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-foreground">Exam Guidelines</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Ensure good lighting and clear camera view</li>
                      <li>• Stay within camera frame at all times</li>
                      <li>• Maximum 3 tab switches allowed</li>
                      <li>• No external assistance permitted</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>

      {/* Floating Elements */}
      <motion.div
        className="absolute top-1/4 right-10 w-16 h-16 bg-gradient-accent rounded-full opacity-10 blur-xl"
        animate={{
          y: [0, -30, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      <motion.div
        className="absolute bottom-1/4 left-10 w-24 h-24 bg-gradient-primary rounded-full opacity-10 blur-xl"
        animate={{
          y: [0, 20, 0],
          scale: [1, 0.9, 1],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </div>
  );
};

export default Dashboard;
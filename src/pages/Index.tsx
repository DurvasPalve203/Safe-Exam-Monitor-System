import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, Shield, Camera, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  const handleGetStarted = () => {
    navigate('/auth');
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

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 gradient-animated opacity-90" />
      
      {/* Floating Elements */}
      <motion.div
        className="absolute top-20 left-10 w-24 h-24 bg-gradient-accent rounded-full opacity-20 blur-xl"
        animate={{
          y: [0, -30, 0],
          x: [0, 15, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      <motion.div
        className="absolute bottom-20 right-10 w-32 h-32 bg-gradient-primary rounded-full opacity-20 blur-xl"
        animate={{
          y: [0, 25, 0],
          x: [0, -20, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 border-b border-border/10 backdrop-blur-sm"
      >
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-primary glow-primary">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                VIT Exam Portal
              </h1>
              <p className="text-xs text-muted-foreground">AI-Powered Monitoring</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button onClick={handleGetStarted} className="btn-hero">
              Get Started
            </Button>
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <main className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-8">
            {/* Main Heading */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-4"
            >
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                AI-Powered
                <br />
                Exam Monitoring
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                Advanced remote examination system with real-time AI monitoring, 
                behavior detection, and seamless integrity tracking
              </p>
            </motion.div>

            {/* Feature Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mt-12"
            >
              <div className="glass p-6 rounded-xl hover-scale">
                <Camera className="h-12 w-12 text-accent mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Live Webcam</h3>
                <p className="text-sm text-muted-foreground">
                  Real-time video monitoring with AI-powered face detection and behavior analysis
                </p>
              </div>
              
              <div className="glass p-6 rounded-xl hover-scale animate-delay-100">
                <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Tab Detection</h3>
                <p className="text-sm text-muted-foreground">
                  Smart tab switching detection with configurable violation limits and warnings
                </p>
              </div>
              
              <div className="glass p-6 rounded-xl hover-scale animate-delay-200">
                <Zap className="h-12 w-12 text-warning mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">AI Analysis</h3>
                <p className="text-sm text-muted-foreground">
                  Advanced AI algorithms for behavioral pattern recognition and anomaly detection
                </p>
              </div>
            </motion.div>

            {/* CTA Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="space-y-6 mt-16"
            >
              <Button
                onClick={handleGetStarted}
                size="lg"
                className="btn-hero text-lg px-8 py-4 h-auto"
              >
                <GraduationCap className="h-5 w-5 mr-2" />
                Start Secure Exam
              </Button>
              
              <div className="flex flex-wrap gap-6 justify-center text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                  VIT Email Authentication
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                  Real-time Monitoring
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-warning rounded-full animate-pulse" />
                  Secure & Private
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      {/* Bottom Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
};

export default Index;

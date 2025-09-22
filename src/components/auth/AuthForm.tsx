import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, User, Hash, Lock, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface AuthFormProps {
  mode: 'signin' | 'signup';
  onToggleMode: () => void;
}

export const AuthForm = ({ mode, onToggleMode }: AuthFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [prn, setPrn] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

  const generateVitEmail = (name: string) => {
    if (!name || name.split(' ').length < 2) return '';
    const nameParts = name.toLowerCase().split(' ');
    return `${nameParts[0]}.${nameParts[nameParts.length - 1]}24@vit.edu`;
  };

  const handleFullNameChange = (value: string) => {
    setFullName(value);
    const generatedEmail = generateVitEmail(value);
    setEmail(generatedEmail);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let result;
      
      if (mode === 'signup') {
        if (!fullName || !prn || !email || !password) {
          toast({
            title: "Missing information",
            description: "Please fill in all required fields.",
            variant: "destructive",
          });
          return;
        }
        result = await signUp(email, password, fullName, prn);
      } else {
        if (!email || !password) {
          toast({
            title: "Missing information",
            description: "Please enter your email and password.",
            variant: "destructive",
          });
          return;
        }
        result = await signIn(email, password);
      }

      if (result.error) {
        toast({
          title: "Authentication failed",
          description: result.error.message || "An error occurred during authentication.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, type: "spring" }}
      className="w-full max-w-md"
    >
      <Card className="glass border-0 shadow-primary">
        <CardHeader className="text-center space-y-2">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex justify-center mb-4"
          >
            <div className="p-3 rounded-full bg-gradient-primary glow-primary">
              <GraduationCap className="h-8 w-8 text-primary-foreground" />
            </div>
          </motion.div>
          <CardTitle className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            {mode === 'signup' ? 'Create Account' : 'Welcome Back'}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {mode === 'signup' 
              ? 'Join the AI-powered exam monitoring system' 
              : 'Sign in to access your exam portal'
            }
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-2"
              >
                <Label htmlFor="fullName" className="text-sm font-medium">
                  Full Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => handleFullNameChange(e.target.value)}
                    className="input-enhanced pl-10"
                    autoComplete="name"
                    required
                  />
                </div>
              </motion.div>
            )}

            {mode === 'signup' && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-2"
              >
                <Label htmlFor="prn" className="text-sm font-medium">
                  PRN (Personal Registration Number)
                </Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="prn"
                    type="text"
                    placeholder="Enter your PRN"
                    value={prn}
                    onChange={(e) => setPrn(e.target.value)}
                    className="input-enhanced pl-10"
                    autoComplete="username"
                    required
                  />
                </div>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: mode === 'signup' ? 0.5 : 0.3 }}
              className="space-y-2"
            >
              <Label htmlFor="email" className="text-sm font-medium">
                VIT Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="firstname.lastname24@vit.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-enhanced pl-10"
                  readOnly={mode === 'signup'}
                  autoComplete="email"
                  required
                />
              </div>
              {mode === 'signup' && (
                <p className="text-xs text-muted-foreground">
                  Email is auto-generated from your full name
                </p>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: mode === 'signup' ? 0.6 : 0.4 }}
              className="space-y-2"
            >
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-enhanced pl-10 pr-10"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-8 w-8 px-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: mode === 'signup' ? 0.7 : 0.5 }}
              className="space-y-4"
            >
              <Button
                type="submit"
                className="btn-hero w-full"
                disabled={loading}
              >
                {loading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full"
                  />
                ) : (
                  mode === 'signup' ? 'Create Account' : 'Sign In'
                )}
              </Button>

              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  onClick={onToggleMode}
                  className="text-sm text-muted-foreground hover:text-accent"
                >
                  {mode === 'signup' 
                    ? 'Already have an account? Sign in' 
                    : "Don't have an account? Sign up"
                  }
                </Button>
              </div>
            </motion.div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
};
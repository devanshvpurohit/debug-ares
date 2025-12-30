import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Terminal, Bug, Code2, Shield, Cpu, Binary } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().email('Invalid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

// Matrix rain character component
const MatrixRain = () => {
  const columns = Array.from({ length: 20 }, (_, i) => i);
  const characters = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF';

  return (
    <div className="matrix-rain-container opacity-20">
      {columns.map((col) => (
        <div
          key={col}
          className="matrix-rain-column"
          style={{
            left: `${col * 5}%`,
            animationDuration: `${3 + Math.random() * 4}s`,
            animationDelay: `${Math.random() * 3}s`,
          }}
        >
          {Array.from({ length: 20 }, () =>
            characters.charAt(Math.floor(Math.random() * characters.length))
          ).join(' ')}
        </div>
      ))}
    </div>
  );
};

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const validateInputs = () => {
    try {
      emailSchema.parse(email);
      passwordSchema.parse(password);
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: 'Validation Error',
          description: err.errors[0].message,
          variant: 'destructive',
        });
      }
      return false;
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs()) return;

    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      toast({
        title: 'Authentication Failed',
        description: error.message === 'Invalid login credentials'
          ? 'Invalid email or password. Please try again.'
          : error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Access Granted',
        description: 'Welcome to the Matrix.',
      });
      navigate('/');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInputs()) return;

    setLoading(true);
    const { error } = await signUp(email, password, fullName);
    setLoading(false);

    if (error) {
      const errorMessage = error.message.includes('already registered')
        ? 'This email is already registered. Please sign in instead.'
        : error.message;

      toast({
        title: 'Registration Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Account Created!',
        description: 'Please check your email to verify your account.',
      });
    }
  };

  return (
    <div className="dark min-h-screen bg-black flex items-center justify-center p-4 matrix-bg relative overflow-hidden">
      {/* Matrix digital rain effect */}
      <MatrixRain />

      {/* Scanline overlay */}
      <div className="absolute inset-0 scanline pointer-events-none opacity-50" />

      {/* Floating matrix orbs */}
      <div className="absolute top-20 left-20 w-64 h-64 bg-matrix-green/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-matrix-green/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/4 w-48 h-48 bg-matrix-green/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-black border border-matrix-green/50 border-glow-intense animate-pulse-glow relative overflow-hidden">
              <Bug className="w-8 h-8 text-matrix-green" />
              {/* Scanning effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-matrix-green/30 to-transparent animate-cyber-scan" />
            </div>
            <h1 className="text-3xl font-bold text-matrix-green text-glow-intense font-matrix tracking-wider">
              DEBUG<span className="text-white">_</span>ARENA
            </h1>
          </div>
          <div className="flex items-center justify-center gap-2 text-matrix-green/70 font-mono text-sm">
            <Terminal className="inline w-4 h-4" />
            <span className="animate-terminal-type overflow-hidden whitespace-nowrap">
              Multi-Language Code Debugging Platform
            </span>
            <span className="terminal-cursor">▌</span>
          </div>
        </div>

        <Card className="glass-effect border-matrix-green/30 border-glow animate-fade-in-up cyber-border bg-black/90" style={{ animationDelay: '0.2s' }}>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2 text-matrix-green font-mono text-xs mb-2">
              <Cpu className="w-4 h-4 animate-pulse" />
              <span className="animate-blink">▌</span>
              <span>SYSTEM_ACCESS_TERMINAL</span>
            </div>
            <CardTitle className="text-matrix-green font-matrix tracking-wide text-glow">Authentication Required</CardTitle>
            <CardDescription className="text-matrix-green/60 font-mono">
              [SECURE] Enter credentials to access the debugging arena
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-black border border-matrix-green/20">
                <TabsTrigger
                  value="signin"
                  className="font-mono data-[state=active]:bg-matrix-green data-[state=active]:text-black data-[state=active]:font-bold text-matrix-green/70 transition-all duration-300"
                >
                  <Code2 className="w-4 h-4 mr-2" />
                  Sign In
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  className="font-mono data-[state=active]:bg-matrix-green data-[state=active]:text-black data-[state=active]:font-bold text-matrix-green/70 transition-all duration-300"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Sign Up
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-matrix-green font-mono text-sm flex items-center gap-2">
                      <Binary className="w-3 h-3" />
                      EMAIL_ADDRESS
                    </Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="user@matrix.net"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-black border-matrix-green/30 focus:border-matrix-green text-matrix-green placeholder:text-matrix-green/30 font-mono focus:shadow-[0_0_15px_rgba(0,255,65,0.3)]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="text-matrix-green font-mono text-sm flex items-center gap-2">
                      <Binary className="w-3 h-3" />
                      PASSWORD
                    </Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-black border-matrix-green/30 focus:border-matrix-green text-matrix-green placeholder:text-matrix-green/30 font-mono focus:shadow-[0_0_15px_rgba(0,255,65,0.3)]"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full font-mono bg-matrix-green hover:bg-matrix-green-light text-black font-bold tracking-wider transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,255,65,0.5)]"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin">⟳</span> AUTHENTICATING...
                      </span>
                    ) : (
                      '> EXECUTE LOGIN'
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-matrix-green font-mono text-sm flex items-center gap-2">
                      <Binary className="w-3 h-3" />
                      FULL_NAME
                    </Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Neo"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="bg-black border-matrix-green/30 focus:border-matrix-green text-matrix-green placeholder:text-matrix-green/30 font-mono focus:shadow-[0_0_15px_rgba(0,255,65,0.3)]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-matrix-green font-mono text-sm flex items-center gap-2">
                      <Binary className="w-3 h-3" />
                      EMAIL_ADDRESS
                    </Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="user@matrix.net"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-black border-matrix-green/30 focus:border-matrix-green text-matrix-green placeholder:text-matrix-green/30 font-mono focus:shadow-[0_0_15px_rgba(0,255,65,0.3)]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-matrix-green font-mono text-sm flex items-center gap-2">
                      <Binary className="w-3 h-3" />
                      PASSWORD
                    </Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-black border-matrix-green/30 focus:border-matrix-green text-matrix-green placeholder:text-matrix-green/30 font-mono focus:shadow-[0_0_15px_rgba(0,255,65,0.3)]"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full font-mono bg-matrix-green hover:bg-matrix-green-light text-black font-bold tracking-wider transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,255,65,0.5)]"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin">⟳</span> CREATING ACCOUNT...
                      </span>
                    ) : (
                      '> REGISTER NEW USER'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="text-center mt-6 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <p className="text-matrix-green/50 text-xs font-mono tracking-widest">
            {'</>'}DEBUG ARENA v2.0 | <span className="text-matrix-green text-glow">MATRIX</span> EDITION{'</>'}
          </p>
        </div>
      </div>
    </div>
  );
}

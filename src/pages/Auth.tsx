import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Terminal, Bug, Code2, Shield } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().email('Invalid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

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
        title: 'Welcome back!',
        description: 'Successfully logged in.',
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
    <div className="dark min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 scanline pointer-events-none opacity-50" />
      
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 border-glow">
              <Bug className="w-8 h-8 text-primary text-glow" />
            </div>
            <h1 className="text-3xl font-bold text-foreground text-glow font-mono">
              DEBUG<span className="text-primary">_</span>CHALLENGE
            </h1>
          </div>
          <p className="text-muted-foreground font-mono text-sm">
            <Terminal className="inline w-4 h-4 mr-2" />
            Multi-Language Code Debugging Platform
          </p>
        </div>

        <Card className="terminal-bg border-primary/20 border-glow">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2 text-primary font-mono text-xs mb-2">
              <span className="animate-blink">▌</span>
              <span>SYSTEM_ACCESS</span>
            </div>
            <CardTitle className="text-foreground">Authentication Required</CardTitle>
            <CardDescription className="text-muted-foreground">
              Enter credentials to access the debugging arena
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-muted/50">
                <TabsTrigger value="signin" className="font-mono">
                  <Code2 className="w-4 h-4 mr-2" />
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="signup" className="font-mono">
                  <Shield className="w-4 h-4 mr-2" />
                  Sign Up
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email" className="text-foreground font-mono text-sm">
                      EMAIL_ADDRESS
                    </Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="user@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-background/50 border-primary/30 focus:border-primary font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password" className="text-foreground font-mono text-sm">
                      PASSWORD
                    </Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-background/50 border-primary/30 focus:border-primary font-mono"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full font-mono"
                    disabled={loading}
                  >
                    {loading ? '> AUTHENTICATING...' : '> EXECUTE LOGIN'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-foreground font-mono text-sm">
                      FULL_NAME
                    </Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="bg-background/50 border-primary/30 focus:border-primary font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-foreground font-mono text-sm">
                      EMAIL_ADDRESS
                    </Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="user@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-background/50 border-primary/30 focus:border-primary font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-foreground font-mono text-sm">
                      PASSWORD
                    </Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-background/50 border-primary/30 focus:border-primary font-mono"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full font-mono"
                    disabled={loading}
                  >
                    {loading ? '> CREATING ACCOUNT...' : '> REGISTER NEW USER'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-muted-foreground text-xs mt-6 font-mono">
          &lt;/&gt; Debug Code Challenge Platform v1.0
        </p>
      </div>
    </div>
  );
}

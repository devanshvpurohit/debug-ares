import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Trophy, Clock, Target, Bug, Medal } from 'lucide-react';
import type { Quiz, ProgrammingLanguage } from '@/types/database';

interface LeaderboardEntry {
  user_id: string;
  email: string;
  full_name: string | null;
  correct_count: number;
  total_time: number;
  total_questions: number;
}

export default function Leaderboard() {
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuizzes();
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedQuiz]);

  const fetchQuizzes = async () => {
    const { data } = await supabase
      .from('quizzes')
      .select('*')
      .eq('is_active', true)
      .order('title');
    
    setQuizzes(data || []);
  };

  const fetchLeaderboard = async () => {
    setLoading(true);

    let query = supabase
      .from('submissions')
      .select(`
        is_correct,
        time_taken,
        assignment:quiz_assignments!inner(
          user_id,
          quiz_id,
          is_completed,
          profile:profiles!inner(email, full_name)
        )
      `)
      .eq('assignment.is_completed', true);

    if (selectedQuiz !== 'all') {
      query = query.eq('assignment.quiz_id', selectedQuiz);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching leaderboard:', error);
      setLoading(false);
      return;
    }

    // Aggregate by user
    const userStats: Record<string, LeaderboardEntry> = {};

    data?.forEach((submission: any) => {
      const userId = submission.assignment.user_id;
      const profile = submission.assignment.profile;

      if (!userStats[userId]) {
        userStats[userId] = {
          user_id: userId,
          email: profile.email,
          full_name: profile.full_name,
          correct_count: 0,
          total_time: 0,
          total_questions: 0,
        };
      }

      userStats[userId].total_questions += 1;
      userStats[userId].total_time += submission.time_taken;
      if (submission.is_correct) {
        userStats[userId].correct_count += 1;
      }
    });

    // Sort by correct count (desc), then by time (asc)
    const sorted = Object.values(userStats).sort((a, b) => {
      if (b.correct_count !== a.correct_count) {
        return b.correct_count - a.correct_count;
      }
      return a.total_time - b.total_time;
    });

    setLeaderboard(sorted);
    setLoading(false);
  };

  const getMedalColor = (index: number) => {
    switch (index) {
      case 0: return 'text-yellow-400';
      case 1: return 'text-gray-400';
      case 2: return 'text-amber-600';
      default: return 'text-muted-foreground';
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="dark min-h-screen bg-background">
      <div className="absolute inset-0 scanline pointer-events-none opacity-30" />
      
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/30">
                <Trophy className="w-6 h-6 text-primary" />
              </div>
              <span className="text-xl font-bold text-foreground font-mono">
                LEADERBOARD<span className="text-primary">_</span>
              </span>
            </div>
          </div>
          
          <Select value={selectedQuiz} onValueChange={setSelectedQuiz}>
            <SelectTrigger className="w-48 bg-background/50 font-mono">
              <SelectValue placeholder="Filter by quiz" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Quizzes</SelectItem>
              {quizzes.map((quiz) => (
                <SelectItem key={quiz.id} value={quiz.id}>
                  {quiz.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-primary font-mono animate-pulse">Loading rankings...</div>
          </div>
        ) : leaderboard.length === 0 ? (
          <Card className="terminal-bg border-border/50">
            <CardContent className="flex flex-col items-center py-20">
              <Trophy className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2 font-mono">
                No Rankings Yet
              </h3>
              <p className="text-muted-foreground text-center font-mono text-sm">
                Complete quizzes to appear on the leaderboard.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Top 3 Podium */}
            {leaderboard.length >= 3 && (
              <div className="grid grid-cols-3 gap-4 mb-8 max-w-2xl mx-auto">
                {[1, 0, 2].map((position) => {
                  const entry = leaderboard[position];
                  if (!entry) return null;
                  
                  return (
                    <Card
                      key={entry.user_id}
                      className={`terminal-bg border-border/50 ${position === 0 ? 'transform -translate-y-4 border-primary/50 border-glow' : ''}`}
                    >
                      <CardContent className="pt-6 text-center">
                        <Medal className={`w-10 h-10 mx-auto mb-2 ${getMedalColor(position)}`} />
                        <p className="font-mono text-2xl font-bold text-foreground mb-1">
                          #{position + 1}
                        </p>
                        <p className="text-sm text-muted-foreground font-mono truncate">
                          {entry.full_name || entry.email.split('@')[0]}
                        </p>
                        <div className="mt-3 space-y-1">
                          <div className="flex items-center justify-center gap-1 text-primary">
                            <Target className="w-4 h-4" />
                            <span className="font-mono">{entry.correct_count}</span>
                          </div>
                          <div className="flex items-center justify-center gap-1 text-muted-foreground text-sm">
                            <Clock className="w-3 h-3" />
                            <span className="font-mono">{formatTime(entry.total_time)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Full Rankings Table */}
            <Card className="terminal-bg border-border/50">
              <CardHeader>
                <CardTitle className="font-mono text-foreground">
                  <span className="text-primary">&gt;</span> Full Rankings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead className="font-mono w-16">Rank</TableHead>
                      <TableHead className="font-mono">Player</TableHead>
                      <TableHead className="font-mono text-center">Correct</TableHead>
                      <TableHead className="font-mono text-center">Total</TableHead>
                      <TableHead className="font-mono text-center">Accuracy</TableHead>
                      <TableHead className="font-mono text-right">Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaderboard.map((entry, index) => (
                      <TableRow key={entry.user_id} className="border-border/30">
                        <TableCell className="font-mono">
                          <div className="flex items-center gap-2">
                            {index < 3 && (
                              <Medal className={`w-4 h-4 ${getMedalColor(index)}`} />
                            )}
                            <span className={index < 3 ? 'font-bold' : ''}>
                              #{index + 1}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-mono text-foreground">
                              {entry.full_name || 'Anonymous'}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {entry.email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-mono text-primary font-bold">
                          {entry.correct_count}
                        </TableCell>
                        <TableCell className="text-center font-mono text-muted-foreground">
                          {entry.total_questions}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={
                              entry.correct_count / entry.total_questions >= 0.8
                                ? 'bg-success/20 text-success border-success/30'
                                : entry.correct_count / entry.total_questions >= 0.5
                                ? 'bg-warning/20 text-warning border-warning/30'
                                : 'bg-destructive/20 text-destructive border-destructive/30'
                            }
                          >
                            {Math.round((entry.correct_count / entry.total_questions) * 100)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {formatTime(entry.total_time)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}

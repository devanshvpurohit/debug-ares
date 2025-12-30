import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Trophy, Clock, Target, Medal, Terminal, Cpu, Binary, Zap } from 'lucide-react';

interface Quiz {
  id: string;
  title: string;
  language: string;
  is_active: boolean;
}

interface LeaderboardEntry {
  user_id: string;
  email: string;
  full_name: string | null;
  correct_count: number;
  total_time: number;
  total_questions: number;
  score: number;
}

// Matrix rain background component
const MatrixBackground = () => {
  const columns = Array.from({ length: 12 }, (_, i) => i);
  const characters = 'アイウエオカキクケコ0123456789';

  return (
    <div className="matrix-rain-container opacity-10">
      {columns.map((col) => (
        <div
          key={col}
          className="matrix-rain-column"
          style={{
            left: `${col * 8}%`,
            animationDuration: `${5 + Math.random() * 5}s`,
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

    setQuizzes((data as Quiz[]) || []);
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

    const userStats: Record<string, LeaderboardEntry> = {};

    (data as any[])?.forEach((submission) => {
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

    const sorted = Object.values(userStats).sort((a, b) => {
      if (b.correct_count !== a.correct_count) {
        return b.correct_count - a.correct_count;
      }
      return a.total_time - b.total_time;
    });

    // Apply scoring: 1st = 50pts, 2nd = 30pts, 3rd = 10pts per quiz
    // Plus bonus points for each correct answer
    const scored = sorted.map((entry, idx) => {
      let positionScore = 0;
      if (idx === 0) positionScore = 50;
      else if (idx === 1) positionScore = 30;
      else if (idx === 2) positionScore = 10;

      // Bonus points: 5 points per correct answer
      const correctBonus = entry.correct_count * 5;

      // Speed bonus: up to 20 points based on avg time per question
      const avgTime = entry.total_questions > 0 ? entry.total_time / entry.total_questions : 999;
      const speedBonus = Math.max(0, Math.round(20 - avgTime / 6)); // ~2min avg = 0 bonus, faster = more

      return {
        ...entry,
        score: positionScore + correctBonus + speedBonus
      };
    });

    setLeaderboard(scored);
    setLoading(false);
  };

  const getMedalColor = (index: number) => {
    switch (index) {
      case 0: return 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]';
      case 1: return 'text-gray-300 drop-shadow-[0_0_8px_rgba(209,213,219,0.5)]';
      case 2: return 'text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]';
      default: return 'text-matrix-green/60';
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="dark min-h-screen bg-black matrix-bg relative overflow-hidden">
      {/* Matrix background */}
      <MatrixBackground />

      {/* Scanline overlay */}
      <div className="absolute inset-0 scanline pointer-events-none opacity-20" />

      {/* Floating orbs */}
      <div className="absolute top-40 left-20 w-80 h-80 bg-matrix-green/5 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-40 right-20 w-64 h-64 bg-matrix-green/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />

      {/* Header */}
      <header className="border-b border-matrix-green/20 glass-effect sticky top-0 z-50 bg-black/80">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="hover:bg-matrix-green/10 text-matrix-green"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-black border border-matrix-green/50 border-glow animate-pulse-glow">
                <Trophy className="w-6 h-6 text-matrix-green" />
              </div>
              <span className="text-xl font-bold text-matrix-green font-matrix tracking-wider text-glow">
                LEADERBOARD<span className="text-white">_</span>
              </span>
            </div>
          </div>

          <Select value={selectedQuiz} onValueChange={setSelectedQuiz}>
            <SelectTrigger className="w-48 bg-black font-mono border-matrix-green/30 text-matrix-green focus:border-matrix-green focus:ring-matrix-green/30">
              <SelectValue placeholder="Filter by quiz" />
            </SelectTrigger>
            <SelectContent className="bg-black border-matrix-green/30 text-matrix-green">
              <SelectItem value="all" className="font-mono focus:bg-matrix-green/20 focus:text-matrix-green">All Quizzes</SelectItem>
              {quizzes.map((quiz) => (
                <SelectItem key={quiz.id} value={quiz.id} className="font-mono focus:bg-matrix-green/20 focus:text-matrix-green">
                  {quiz.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 relative z-10">
        {/* Header info */}
        <div className="mb-8 animate-fade-in-up">
          <div className="flex items-center gap-2 text-matrix-green/70 font-mono text-xs mb-2">
            <Terminal className="w-4 h-4" />
            <span className="animate-blink">▌</span>
            <span>RANKINGS_DATABASE</span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-matrix-green font-mono flex items-center gap-3 text-glow">
              <Zap className="w-6 h-6 animate-pulse" />
              <span className="animate-pulse">Loading rankings...</span>
            </div>
          </div>
        ) : leaderboard.length === 0 ? (
          <Card className="glass-effect border-matrix-green/20 bg-black/80 cyber-border animate-fade-in-up">
            <CardContent className="flex flex-col items-center py-20">
              <div className="p-4 rounded-xl bg-black border border-matrix-green/30 border-glow mb-6">
                <Trophy className="w-16 h-16 text-matrix-green/50" />
              </div>
              <h3 className="text-xl font-semibold text-matrix-green mb-2 font-matrix tracking-wide">
                No Rankings Yet
              </h3>
              <p className="text-matrix-green/50 text-center font-mono text-sm">
                [EMPTY] Complete quizzes to appear on the leaderboard.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Top 3 podium */}
            {leaderboard.length >= 3 && (
              <div className="grid grid-cols-3 gap-4 mb-8 max-w-2xl mx-auto animate-fade-in-up">
                {[1, 0, 2].map((position) => {
                  const entry = leaderboard[position];
                  if (!entry) return null;

                  return (
                    <Card
                      key={entry.user_id}
                      className={`glass-effect border-matrix-green/20 bg-black/80 cyber-border transition-all duration-500 hover:border-matrix-green/60 ${position === 0 ? 'transform -translate-y-4 border-matrix-green/50 border-glow-intense' : ''
                        }`}
                    >
                      <CardContent className="pt-6 text-center">
                        <Medal className={`w-10 h-10 mx-auto mb-2 ${getMedalColor(position)}`} />
                        <p className="font-matrix text-2xl font-bold text-matrix-green mb-1 text-glow">
                          #{position + 1}
                        </p>
                        <p className="text-sm text-matrix-green/70 font-mono truncate">
                          {entry.full_name || entry.email.split('@')[0]}
                        </p>
                        <div className="mt-3 space-y-1">
                          <div className="flex items-center justify-center gap-1 text-matrix-green">
                            <Trophy className="w-4 h-4" />
                            <span className="font-mono font-bold text-lg text-glow">{entry.score}</span>
                            <span className="text-xs">pts</span>
                          </div>
                          <div className="flex items-center justify-center gap-1 text-matrix-green/70">
                            <Target className="w-4 h-4" />
                            <span className="font-mono text-glow">{entry.correct_count}/{entry.total_questions}</span>
                          </div>
                          <div className="flex items-center justify-center gap-1 text-matrix-green/50 text-sm">
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

            {/* Full rankings table */}
            <Card className="glass-effect border-matrix-green/20 bg-black/80 cyber-border animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <CardHeader>
                <CardTitle className="font-matrix text-matrix-green tracking-wide text-glow flex items-center gap-2">
                  <Binary className="w-5 h-5" />
                  <span className="text-white">{'>'}</span> Full Rankings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-matrix-green/20 hover:bg-transparent">
                      <TableHead className="font-mono w-16 text-matrix-green/70">Rank</TableHead>
                      <TableHead className="font-mono text-matrix-green/70">Player</TableHead>
                      <TableHead className="font-mono text-center text-matrix-green/70">Score</TableHead>
                      <TableHead className="font-mono text-center text-matrix-green/70">Solved</TableHead>
                      <TableHead className="font-mono text-center text-matrix-green/70">Accuracy</TableHead>
                      <TableHead className="font-mono text-right text-matrix-green/70">Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaderboard.map((entry, index) => (
                      <TableRow
                        key={entry.user_id}
                        className="border-matrix-green/10 hover:bg-matrix-green/5 transition-colors"
                      >
                        <TableCell className="font-mono">
                          <div className="flex items-center gap-2">
                            {index < 3 && (
                              <Medal className={`w-4 h-4 ${getMedalColor(index)}`} />
                            )}
                            <span className={`text-matrix-green ${index < 3 ? 'font-bold text-glow' : ''}`}>
                              #{index + 1}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-mono text-matrix-green">
                              {entry.full_name || 'Anonymous'}
                            </p>
                            <p className="text-xs text-matrix-green/40 font-mono">
                              {entry.email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-mono font-bold text-matrix-green text-lg text-glow">
                            {entry.score}
                          </span>
                          <span className="text-xs text-matrix-green/50 ml-1">pts</span>
                        </TableCell>
                        <TableCell className="text-center font-mono text-matrix-green">
                          <span className="font-bold text-glow">{entry.correct_count}</span>
                          <span className="text-matrix-green/50">/{entry.total_questions}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={
                              entry.correct_count / entry.total_questions >= 0.8
                                ? 'bg-matrix-green/20 text-matrix-green border-matrix-green/30 font-mono'
                                : entry.correct_count / entry.total_questions >= 0.5
                                  ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 font-mono'
                                  : 'bg-red-500/20 text-red-400 border-red-500/30 font-mono'
                            }
                          >
                            {Math.round((entry.correct_count / entry.total_questions) * 100)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-matrix-green/60">
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

      {/* Footer */}
      <footer className="border-t border-matrix-green/10 py-4 mt-8 relative z-10">
        <div className="container mx-auto px-4 text-center">
          <p className="text-matrix-green/30 text-xs font-mono tracking-widest">
            {'</>'}DEBUG ARENA v2.0 | <span className="text-matrix-green/50">MATRIX</span> EDITION{'</>'}
          </p>
        </div>
      </footer>
    </div>
  );
}

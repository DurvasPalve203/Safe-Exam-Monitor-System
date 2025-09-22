import { motion } from 'framer-motion';
import { AlertTriangle, Users, Smartphone, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ViolationAlert } from '@/utils/aiDetection';

interface AiViolationHistoryProps {
  violations: ViolationAlert[];
}

export const AiViolationHistory = ({ violations }: AiViolationHistoryProps) => {
  const getViolationIcon = (type: string) => {
    switch (type) {
      case 'multiple_persons':
        return <Users className="h-4 w-4" />;
      case 'device_detected':
        return <Smartphone className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getViolationColor = (type: string) => {
    switch (type) {
      case 'multiple_persons':
        return 'destructive';
      case 'device_detected':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (violations.length === 0) {
    return (
      <Card className="glass border-0 shadow-accent">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            AI Violation History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No AI violations detected</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass border-0 shadow-warning">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          AI Violation History
          <Badge variant="destructive" className="ml-auto">
            {violations.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[200px] w-full">
          <div className="space-y-3">
            {violations.map((violation, index) => (
              <motion.div
                key={`${violation.timestamp}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border/50"
              >
                <div className={`p-1.5 rounded-full ${
                  violation.type === 'multiple_persons' 
                    ? 'bg-destructive/10 text-destructive' 
                    : 'bg-destructive/10 text-destructive'
                }`}>
                  {getViolationIcon(violation.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge 
                      variant={getViolationColor(violation.type) as any}
                      className="text-xs"
                    >
                      {violation.type === 'multiple_persons' ? 'Multiple People' : 'Device Detected'}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatTimestamp(violation.timestamp)}
                    </div>
                  </div>
                  
                  <p className="text-sm text-foreground font-medium mb-1">
                    {violation.message}
                  </p>
                  
                  <div className="text-xs text-muted-foreground">
                    Confidence: {Math.round(violation.confidence * 100)}%
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
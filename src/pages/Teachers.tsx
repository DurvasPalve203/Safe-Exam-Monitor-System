import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";

interface Teacher {
  id: string;
  name: string;
  whatsapp_number: string;
  email: string;
  is_active: boolean;
}

const Teachers = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [name, setName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTeachers(data || []);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      toast({
        title: "Error",
        description: "Failed to fetch teachers",
        variant: "destructive",
      });
    }
  };

  const addTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !whatsappNumber.trim() || !email.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('teachers')
        .insert([{
          name: name.trim(),
          whatsapp_number: whatsappNumber.trim(),
          email: email.trim(),
          is_active: true
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Teacher added successfully",
      });

      setName("");
      setWhatsappNumber("");
      setEmail("");
      fetchTeachers();
    } catch (error) {
      console.error('Error adding teacher:', error);
      toast({
        title: "Error",
        description: "Failed to add teacher",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Please log in to manage teachers.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Teacher Management</CardTitle>
            <CardDescription>
              Add teacher details to receive email alerts for exam violations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={addTeacher} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <Label htmlFor="name">Teacher Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Dr. John Smith"
                  disabled={loading}
                />
              </div>
              <div>
                <Label htmlFor="whatsapp">WhatsApp Number</Label>
                <Input
                  id="whatsapp"
                  value={whatsappNumber}
                  onChange={(e) => setWhatsappNumber(e.target.value)}
                  placeholder="+1234567890"
                  disabled={loading}
                />
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teacher@school.edu"
                  disabled={loading}
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? "Adding..." : "Add Teacher"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current Teachers ({teachers.length})</CardTitle>
            <CardDescription>
              Teachers who will receive email alerts for exam violations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {teachers.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No teachers added yet. Add teachers above to start receiving alerts.
              </p>
            ) : (
              <div className="grid gap-4">
                {teachers.map((teacher) => (
                  <div
                    key={teacher.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <h3 className="font-medium">{teacher.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        WhatsApp: {teacher.whatsapp_number}
                      </p>
                      {teacher.email && (
                        <p className="text-sm text-muted-foreground">
                          Email: {teacher.email}
                        </p>
                      )}
                    </div>
                    <Badge variant={teacher.is_active ? "default" : "secondary"}>
                      {teacher.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center">
          <Button
            variant="outline"
            onClick={() => window.history.back()}
          >
            ← Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Teachers;
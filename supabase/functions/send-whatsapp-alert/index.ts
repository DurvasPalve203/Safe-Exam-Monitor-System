import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ViolationData {
  studentName: string;
  prn: string;
  activity: string;
  timestamp: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const whatsappToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN')!;
    
    if (!whatsappToken) {
      throw new Error('WhatsApp access token not configured');
    }

    // Initialize Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { studentName, prn, activity, timestamp }: ViolationData = await req.json();

    console.log('Received violation alert:', { studentName, prn, activity, timestamp });

    // Get all active teachers
    const { data: teachers, error: teachersError } = await supabase
      .from('teachers')
      .select('name, whatsapp_number')
      .eq('is_active', true);

    if (teachersError) {
      console.error('Error fetching teachers:', teachersError);
      throw new Error('Failed to fetch teachers');
    }

    if (!teachers || teachers.length === 0) {
      console.log('No active teachers found');
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'No active teachers to notify' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Format timestamp for display
    const formattedTime = new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    // Prepare WhatsApp message
    const message = `🚨 Exam Alert
Student: ${studentName} (PRN: ${prn})
Activity: ${activity}
Time: ${formattedTime}`;

    console.log('Sending message to teachers:', message);

    // Send WhatsApp messages to all teachers
    const promises = teachers.map(async (teacher) => {
      try {
        // Meta WhatsApp Cloud API endpoint
        const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
        if (!phoneNumberId) {
          throw new Error('WhatsApp phone number ID not configured');
        }
        const whatsappUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
        
        const response = await fetch(whatsappUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${whatsappToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: teacher.whatsapp_number,
            type: 'text',
            text: {
              body: message
            }
          })
        });

        const result = await response.json();
        
        if (!response.ok) {
          console.error(`Failed to send WhatsApp to ${teacher.name}:`, result);
          return { teacher: teacher.name, success: false, error: result };
        }

        console.log(`Successfully sent WhatsApp to ${teacher.name}:`, result);
        return { teacher: teacher.name, success: true, messageId: result.messages?.[0]?.id };
        
      } catch (error) {
        console.error(`Error sending WhatsApp to ${teacher.name}:`, error);
        return { teacher: teacher.name, success: false, error: error.message };
      }
    });

    const results = await Promise.all(promises);
    const successCount = results.filter(r => r.success).length;
    
    console.log(`WhatsApp alert results: ${successCount}/${teachers.length} successful`);

    return new Response(JSON.stringify({
      success: true,
      message: `Alert sent to ${successCount}/${teachers.length} teachers`,
      results
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in send-whatsapp-alert function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);
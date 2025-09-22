import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { Resend } from "npm:resend@2.0.0";

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
    const resendApiKey = Deno.env.get('RESEND_API_KEY')!;
    
    if (!resendApiKey) {
      throw new Error('Resend API key not configured');
    }

    // Initialize Supabase client with service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    const { studentName, prn, activity, timestamp }: ViolationData = await req.json();

    console.log('Received violation alert:', { studentName, prn, activity, timestamp });

    // Get all active teachers with email addresses
    const { data: teachers, error: teachersError } = await supabase
      .from('teachers')
      .select('name, email')
      .eq('is_active', true)
      .not('email', 'is', null);

    if (teachersError) {
      console.error('Error fetching teachers:', teachersError);
      throw new Error('Failed to fetch teachers');
    }

    if (!teachers || teachers.length === 0) {
      console.log('No active teachers with email addresses found');
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'No active teachers with email addresses to notify' 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Format timestamp for display
    const formattedTime = new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    // Prepare email content
    const subject = `🚨 Exam Violation Alert - ${studentName}`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">🚨 Exam Violation Alert</h1>
        </div>
        <div style="background-color: #f8f9fa; padding: 20px; border: 1px solid #dee2e6; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="color: #dc2626; margin-top: 0;">Violation Details</h2>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 8px; border: 1px solid #dee2e6; background-color: #ffffff; font-weight: bold;">Student Name:</td>
              <td style="padding: 8px; border: 1px solid #dee2e6; background-color: #ffffff;">${studentName}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #dee2e6; background-color: #ffffff; font-weight: bold;">PRN:</td>
              <td style="padding: 8px; border: 1px solid #dee2e6; background-color: #ffffff;">${prn}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #dee2e6; background-color: #ffffff; font-weight: bold;">Activity:</td>
              <td style="padding: 8px; border: 1px solid #dee2e6; background-color: #ffffff;">${activity}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #dee2e6; background-color: #ffffff; font-weight: bold;">Time:</td>
              <td style="padding: 8px; border: 1px solid #dee2e6; background-color: #ffffff;">${formattedTime}</td>
            </tr>
          </table>
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 4px; padding: 15px; margin-top: 20px;">
            <p style="margin: 0; color: #856404;"><strong>Action Required:</strong> Please review this violation and take appropriate action as per exam protocol.</p>
          </div>
        </div>
        <div style="text-align: center; padding: 15px; color: #6c757d; font-size: 12px;">
          <p>This is an automated alert from the Exam Monitoring System</p>
        </div>
      </div>
    `;

    console.log('Sending emails to teachers:', teachers.map(t => t.name));

    // Send emails to all teachers with proper error handling and fallback
    const testEmail = Deno.env.get('RESEND_TEST_EMAIL') || null;
    const promises = teachers.map(async (teacher) => {
      try {
        const resp: any = await resend.emails.send({
          from: 'Exam Monitor <onboarding@resend.dev>',
          to: [teacher.email],
          subject,
          html: htmlContent,
        });

        if (resp?.error) {
          console.error(`Resend error for ${teacher.name} (${teacher.email}):`, resp.error);

          // Fallback to test email if domain not verified and RESEND_TEST_EMAIL is set
          const code = resp?.error?.statusCode ?? resp?.error?.status ?? 0;
          const msg: string = resp?.error?.error || resp?.error?.message || JSON.stringify(resp.error);

          if (testEmail && code === 403) {
            console.log(`Retrying via RESEND_TEST_EMAIL fallback for ${teacher.name} -> ${testEmail}`);
            const retry: any = await resend.emails.send({
              from: 'Exam Monitor <onboarding@resend.dev>',
              to: [testEmail],
              subject: `${subject} (routed to test inbox)`,
              html: htmlContent + `<p style="margin-top:16px;color:#6b7280;font-size:12px;">Originally intended for: ${teacher.email}</p>`,
            });
            if (retry?.error) {
              console.error(`Fallback send failed for ${teacher.name}:`, retry.error);
              return { teacher: teacher.name, success: false, error: retry.error?.message || JSON.stringify(retry.error) };
            }
            console.log(`Fallback email sent for ${teacher.name}:`, retry?.data || retry);
            return { teacher: teacher.name, success: true, messageId: retry?.data?.id || retry?.id, routedTo: testEmail };
          }

          return { teacher: teacher.name, success: false, error: msg };
        }

        console.log(`Successfully sent email to ${teacher.name}:`, resp?.data || resp);
        return { teacher: teacher.name, success: true, messageId: resp?.data?.id || resp?.id };
      } catch (error: any) {
        console.error(`Error sending email to ${teacher.name}:`, error);
        return { teacher: teacher.name, success: false, error: error?.message || 'Unknown error' };
      }
    });

    const results = await Promise.all(promises);
    const successCount = results.filter(r => r.success).length;
    
    console.log(`Email alert results: ${successCount}/${teachers.length} successful`);

    const responseBody = {
      success: successCount > 0,
      message: `Alert sent to ${successCount}/${teachers.length} teachers`,
      requires_domain_verification: successCount === 0,
      hint: successCount === 0 ? 'Verify your domain at resend.com/domains or set RESEND_TEST_EMAIL secret to route emails to a single inbox during testing.' : undefined,
      results,
    };

    return new Response(JSON.stringify(responseBody), {
      status: successCount > 0 ? 200 : 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in send-email-alert function:', error);
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
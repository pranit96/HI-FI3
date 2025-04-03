import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiRequest } from '@/lib/queryClient';
import { ZodError } from 'zod';
import { Loader2 } from 'lucide-react';

const TestEmail = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [emailType, setEmailType] = useState('welcome');
  const [isSending, setIsSending] = useState(false);

  const sendTestEmail = async () => {
    if (!email) {
      toast({
        title: 'Email required',
        description: 'Please enter an email address',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          type: emailType,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      toast({
        title: 'Email Sent',
        description: `Test email of type "${emailType}" has been sent to ${email}`,
      });
    } catch (error: any) {
      console.error('Failed to send test email:', error);
      toast({
        title: 'Failed to send email',
        description: error?.message || 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Email Delivery</CardTitle>
        <CardDescription>
          Send a test email to verify your SendGrid integration
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="email">
              Recipient Email
            </label>
            <Input
              id="email"
              placeholder="test@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Email Type</label>
            <Select value={emailType} onValueChange={setEmailType}>
              <SelectTrigger>
                <SelectValue placeholder="Select email type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="welcome">Welcome</SelectItem>
                <SelectItem value="report">Weekly Report</SelectItem>
                <SelectItem value="reminder">Upload Reminder</SelectItem>
                <SelectItem value="analysis">Analysis Complete</SelectItem>
                <SelectItem value="goal">Goal Progress</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={sendTestEmail} disabled={isSending}>
          {isSending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            'Send Test Email'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

const TestGroqAPI = () => {
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [response, setResponse] = useState('');

  const testGroqApi = async () => {
    if (!text) {
      toast({
        title: 'Input required',
        description: 'Please enter some text to analyze',
        variant: 'destructive',
      });
      return;
    }

    setIsAnalyzing(true);
    setResponse('');
    try {
      const response = await fetch('/api/admin/test-groq', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const result = await response.json();
      
      setResponse(result.response);
      toast({
        title: 'Analysis Complete',
        description: 'Groq API responded successfully',
      });
    } catch (error: any) {
      console.error('Failed to test Groq API:', error);
      toast({
        title: 'API Error',
        description: error?.message || 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Groq API</CardTitle>
        <CardDescription>
          Test your Groq API integration by sending a simple prompt
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="text">
              Prompt Text
            </label>
            <Input
              id="text"
              placeholder="Enter text to analyze..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
          {response && (
            <div className="mt-4">
              <label className="text-sm font-medium">Response:</label>
              <div className="mt-2 rounded-md bg-muted p-4 text-sm">
                <pre className="whitespace-pre-wrap">{response}</pre>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={testGroqApi} disabled={isAnalyzing}>
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            'Test Groq API'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

const DatabaseTest = () => {
  const { toast } = useToast();
  const [isTesting, setIsTesting] = useState(false);
  const [dbStatus, setDbStatus] = useState<null | { status: string; message: string }>(null);

  const testDatabase = async () => {
    setIsTesting(true);
    setDbStatus(null);
    try {
      const response = await fetch('/api/admin/test-database');
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const result = await response.json();

      setDbStatus({
        status: result.success ? 'success' : 'error',
        message: result.message,
      });
      
      toast({
        title: result.success ? 'Database Connected' : 'Database Error',
        description: result.message,
        variant: result.success ? 'default' : 'destructive',
      });
    } catch (error: any) {
      console.error('Failed to test database:', error);
      setDbStatus({
        status: 'error',
        message: error?.message || 'Database connection failed',
      });
      
      toast({
        title: 'Database Error',
        description: error?.message || 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Database Connection</CardTitle>
        <CardDescription>
          Verify that your application can connect to the database
        </CardDescription>
      </CardHeader>
      <CardContent>
        {dbStatus && (
          <div
            className={`mt-2 rounded-md p-4 text-sm ${
              dbStatus.status === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}
          >
            {dbStatus.message}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={testDatabase} disabled={isTesting}>
          {isTesting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Testing...
            </>
          ) : (
            'Test Database Connection'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default function AdminPage() {
  return (
    <div className="container py-10">
      <div className="mb-10 space-y-2">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Test and verify system integrations and functionality
        </p>
      </div>

      <Tabs defaultValue="email">
        <TabsList className="mb-6">
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="ai">AI / Groq</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
        </TabsList>
        
        <TabsContent value="email">
          <TestEmail />
        </TabsContent>
        
        <TabsContent value="ai">
          <TestGroqAPI />
        </TabsContent>
        
        <TabsContent value="database">
          <DatabaseTest />
        </TabsContent>
      </Tabs>
    </div>
  );
}
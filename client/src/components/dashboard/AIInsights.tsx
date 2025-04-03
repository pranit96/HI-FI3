import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Info, CheckCircle, AlertTriangle } from "lucide-react";

type Insight = {
  id: number;
  title: string;
  description: string;
  type: 'info' | 'warning' | 'success';
  category: string | null;
  createdAt: string;
};

export default function AIInsights() {
  // Get AI-generated insights
  const { data: insights = [], isLoading: insightsLoading } = useQuery<Insight[]>({
    queryKey: ['/api/insights'],
  });

  // Get icon based on insight type
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'info':
        return <Info className="h-6 w-6 text-blue-600 dark:text-blue-400" />;
      case 'success':
        return <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />;
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />;
      default:
        return <Info className="h-6 w-6 text-blue-600 dark:text-blue-400" />;
    }
  };

  // Get background color based on insight type
  const getInsightBgColor = (type: string) => {
    switch (type) {
      case 'info':
        return 'bg-blue-100 dark:bg-blue-900';
      case 'success':
        return 'bg-green-100 dark:bg-green-900';
      case 'warning':
        return 'bg-yellow-100 dark:bg-yellow-900';
      default:
        return 'bg-blue-100 dark:bg-blue-900';
    }
  };

  // Loading state
  if (insightsLoading) {
    return (
      <Card>
        <CardHeader className="flex items-center justify-between pb-3">
          <div className="flex items-center">
            <CardTitle className="text-lg font-medium">AI-Powered Insights</CardTitle>
            <Skeleton className="ml-2 h-6 w-24" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (insights.length === 0) {
    return (
      <Card>
        <CardHeader className="flex items-center justify-between pb-3">
          <div className="flex items-center">
            <CardTitle className="text-lg font-medium">AI-Powered Insights</CardTitle>
            <span className="inline-flex items-center ml-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
              AI Generated
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8">
            <Info className="h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-muted-foreground text-center">
              No insights available yet. Upload your bank statements to get AI-powered financial insights.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort insights by date (most recent first)
  const sortedInsights = [...insights].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <Card>
      <CardHeader className="flex items-center justify-between pb-3">
        <div className="flex items-center">
          <CardTitle className="text-lg font-medium">AI-Powered Insights</CardTitle>
          <span className="inline-flex items-center ml-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
            AI Generated
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedInsights.slice(0, 3).map((insight) => (
            <div key={insight.id} className="border border-muted rounded-lg p-4">
              <div className="flex items-start">
                <div className={`flex-shrink-0 ${getInsightBgColor(insight.type)} rounded-full p-2`}>
                  {getInsightIcon(insight.type)}
                </div>
                <div className="ml-4">
                  <h3 className="text-base font-medium">{insight.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{insight.description}</p>
                  {insight.category && (
                    <span className="inline-flex items-center mt-2 px-2 py-0.5 rounded text-xs font-medium bg-muted">
                      {insight.category}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

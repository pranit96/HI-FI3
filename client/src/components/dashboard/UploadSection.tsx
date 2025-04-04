import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UploadCloud, FileText, Check, AlertCircle, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

type BankAccount = {
  id: number;
  name: string;
  shortCode: string;
  color: string;
};

type BankStatement = {
  id: number;
  fileName: string;
  uploadedAt: string;
  processed: boolean;
};

export default function UploadSection() {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedBankAccount, setSelectedBankAccount] = useState<number | null>(null);
  const [isMultipleUpload, setIsMultipleUpload] = useState(false);
  const { toast } = useToast();

  // Get bank accounts
  const { data: bankAccounts = [], isLoading: accountsLoading } = useQuery<BankAccount[]>({
    queryKey: ['/api/bank-accounts'],
  });

  // Get recent bank statements
  const { data: bankStatements = [], isLoading: statementsLoading } = useQuery<BankStatement[]>({
    queryKey: ['/api/bank-statements'],
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ formData, headers }: { formData: FormData; headers: Record<string, string> }) => {
      const response = await fetch('/api/bank-statements/upload', {
        method: 'POST',
        body: formData,
        headers: {
          ...headers
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Upload failed");
      }

      return await response.json();
    },
    onSuccess: (data) => {
      if (isMultipleUpload && data.processedStatements) {
        toast({
          title: "Multiple statements uploaded",
          description: `Successfully processed ${data.processedStatements.length} statements with ${data.combinedStats?.totalTransactions || 0} transactions.`,
          variant: "success",
        });
      } else {
        toast({
          title: "Statement uploaded successfully",
          description: `Processed ${data.transactionCount || 0} transactions.`,
          variant: "success",
        });
      }

      setFiles([]);
      queryClient.invalidateQueries({ queryKey: ['/api/bank-statements'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/insights'] });
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload bank statement. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      const validFiles = droppedFiles.filter(file => file.type === "application/pdf");

      if (validFiles.length === 0) {
        toast({
          title: "Invalid file format",
          description: "Please upload only PDF files.",
          variant: "destructive",
        });
        return;
      }

      if (validFiles.length !== droppedFiles.length) {
        toast({
          title: "Some files skipped",
          description: "Only PDF files were added. Non-PDF files were skipped.",
          variant: "default",
        });
      }

      if (isMultipleUpload) {
        // Ensure no duplicates
        const uniqueFiles = validFiles.filter(newFile =>
          !files.some(existingFile => existingFile.name === newFile.name)
        );
        const newFiles = [...files, ...uniqueFiles].slice(0, 5);
        setFiles(newFiles);

        if (uniqueFiles.length < validFiles.length) {
          toast({
            title: "Duplicate files skipped",
            description: "Some files were already selected and were skipped.",
            variant: "default",
          });
        }
      } else {
        setFiles([validFiles[0]]);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;

    const selectedFiles = Array.from(fileList).filter(file => file.type === "application/pdf");

    if (selectedFiles.length === 0) {
      toast({
        title: "Invalid file format",
        description: "Please select only PDF files.",
        variant: "destructive",
      });
      return;
    }

    if (isMultipleUpload) {
      if (selectedFiles.length > 5) {
        toast({
          title: "Too many files",
          description: "Maximum 5 files allowed. Only first 5 will be processed.",
          variant: "default",
        });
      }
      setFiles(selectedFiles.slice(0, 5));
    } else {
      setFiles([selectedFiles[0]]);
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one bank statement PDF to upload.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedBankAccount) {
      toast({
        title: "Bank account required",
        description: "Please select a bank account for the statements.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    const fieldName = isMultipleUpload ? 'statements' : 'statement';

    // Validate file sizes
    const oversizedFiles = files.filter(file => file.size > 10 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast({
        title: "Files too large",
        description: `${oversizedFiles.length} file(s) exceed the 10MB limit`,
        variant: "destructive",
      });
      return;
    }

    if (isMultipleUpload) {
      files.forEach(file => formData.append(fieldName, file));
    } else {
      formData.append(fieldName, files[0]);
    }
    formData.append("bankAccountId", selectedBankAccount.toString());

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
      'x-auth-token': localStorage.getItem('auth-token') || '',
      ...(isMultipleUpload ? { 'x-upload-type': 'multiple' } : {})
    };
    

    uploadMutation.mutate(
      { formData, headers },
      {
        onError: (error: any) => {
          const errorMessage = error.response?.data?.error || error.message || "Upload failed";
          if (error.response?.status === 401) {
            toast({
              title: "Authentication error",
              description: "Please log in again to continue",
              variant: "destructive"
            });
          } else if (error.response?.status === 413) {
            toast({
              title: "Files too large",
              description: "Total upload size exceeds server limit",
              variant: "destructive"
            });
          } else {
            toast({
              title: "Upload failed",
              description: errorMessage,
              variant: "destructive"
            });
          }
        },
        onSuccess: (data) => {
          setFiles([]);
          toast({
            title: "Upload successful",
            description: isMultipleUpload 
              ? `Successfully processed ${data.processedStatements?.length} statements`
              : "Statement processed successfully",
            variant: "success"
          });
        }
      }
    );
  };

  if (accountsLoading || statementsLoading) {
    return (
      <Card className="h-full">
        <CardContent className="p-6">
          <Skeleton className="h-6 w-40 mb-4" />
          <Skeleton className="h-32 w-full mb-4" />
          <Skeleton className="h-5 w-full mb-2" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (bankAccounts.length === 0) {
    return (
      <Card className="h-full">
        <CardContent className="p-6">
          <CardTitle className="text-lg font-medium mb-4">Upload Bank Statement</CardTitle>
          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-muted rounded-lg">
            <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-center text-muted-foreground">
              Please add a bank account first to upload statements.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const recentStatements = bankStatements.slice(0, 2);

  return (
    <Card className="h-full">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-4">
          <CardTitle className="text-lg font-medium">Upload Bank Statement</CardTitle>
          <div className="flex items-center">
            <Switch
              id="multi-upload-switch"
              checked={isMultipleUpload}
              onCheckedChange={setIsMultipleUpload}
              className="mr-2"
            />
            <Label htmlFor="multi-upload-switch" className="text-sm cursor-pointer">
              Multiple files
            </Label>
          </div>
        </div>

        <div
          className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
            isDragging
              ? "border-primary bg-primary/5"
              : files.length > 0
              ? "border-green-500 bg-green-50 dark:bg-green-900/10"
              : "border-muted"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById("file-upload")?.click()}
        >
          <input
            id="file-upload"
            type="file"
            accept=".pdf"
            multiple={isMultipleUpload}
            className="hidden"
            onChange={handleFileChange}
          />

          {files.length > 0 ? (
            <div className="flex flex-col items-center">
              <FileText className="h-8 w-8 text-green-500 mb-2" />
              {files.length === 1 ? (
                <>
                  <p className="font-medium">{files[0].name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(files[0].size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium">{files.length} files selected</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total size: {(files.reduce((acc, file) => acc + file.size, 0) / 1024 / 1024).toFixed(2)} MB
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <UploadCloud className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Drag and drop your PDF{isMultipleUpload ? 's' : ''} here, or <span className="text-primary font-medium">browse</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Supported formats: PDF (HDFC, ICICI) {isMultipleUpload && '• Max 5 files'}
              </p>
            </div>
          )}
        </div>

        {isMultipleUpload && files.length > 1 && (
          <div className="mt-3 max-h-32 overflow-y-auto border rounded-md p-2">
            {files.map((file, index) => (
              <div key={index} className="flex justify-between items-center py-1 text-sm border-b last:border-0">
                <div className="flex items-center truncate mr-2">
                  <FileText className="h-3 w-3 mr-2 flex-shrink-0" />
                  <span className="truncate">{file.name}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-xs text-muted-foreground mr-2">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFiles(files.filter((_, i) => i !== index));
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {files.length > 0 && (
          <div className="mt-4">
            <label className="text-sm font-medium mb-1 block">Select Bank Account</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {bankAccounts.map((account) => (
                <Button
                  key={account.id}
                  type="button"
                  variant={selectedBankAccount === account.id ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => setSelectedBankAccount(account.id)}
                >
                  <div
                    className="w-4 h-4 rounded-full mr-2"
                    style={{ backgroundColor: account.color }}
                  ></div>
                  <span className="truncate">{account.name}</span>
                </Button>
              ))}
            </div>

            <Button
              className="w-full mt-4"
              onClick={handleUpload}
              disabled={uploadMutation.isPending}
            >
              {uploadMutation.isPending ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Uploading...
                </>
              ) : (
                `Upload ${files.length > 1 ? 'Statements' : 'Statement'}`
              )}
            </Button>
          </div>
        )}

        <div className="mt-4">
          <h3 className="text-sm font-medium mb-2">Recent Uploads</h3>
          {recentStatements.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No recent uploads</p>
          ) : (
            <div className="space-y-2">
              {recentStatements.map((statement) => (
                <div
                  key={statement.id}
                  className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded"
                >
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 text-red-500 mr-2" />
                    <span className="text-sm">{statement.fileName}</span>
                  </div>
                  <div className="flex items-center">
                    {statement.processed ? (
                      <Check className="h-4 w-4 text-green-500 mr-1" />
                    ) : null}
                    <span className="text-xs text-muted-foreground">
                      {formatDate(statement.uploadedAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Improved getAuthToken function
function getAuthToken(): string {
  const token = localStorage.getItem('auth-token'); // Ensure this key matches your authentication setup
  if (!token) {
    throw new Error('No authentication token found');
  }
  return token;
}
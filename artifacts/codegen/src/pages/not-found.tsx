import { Link } from "wouter";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/Button";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background text-foreground">
      <div className="flex flex-col items-center text-center space-y-6">
        <div className="w-16 h-16 bg-destructive/10 text-destructive rounded-2xl flex items-center justify-center shadow-lg shadow-destructive/10 border border-destructive/20">
          <AlertCircle className="w-8 h-8" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">404 - Page Not Found</h1>
          <p className="text-muted-foreground max-w-[300px] mx-auto">
            The module or component you are looking for has been moved or doesn't exist.
          </p>
        </div>
        
        <Link href="/" className="inline-block mt-4">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Studio
          </Button>
        </Link>
      </div>
    </div>
  );
}

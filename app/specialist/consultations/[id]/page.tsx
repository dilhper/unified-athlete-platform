"use client";

import { useParams, useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  FileText,
  CheckCircle,
  Video,
  Phone,
} from "lucide-react";
import { useEffect, useState } from "react";

export default function ConsultationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [consultation, setConsultation] = useState<any | null>(null);
  const [athlete, setAthlete] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notes, setNotes] = useState("");

  const consultationId = Array.isArray(params.id) ? params.id[0] : params.id;

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetch("/api/users?role=specialist&limit=1", { cache: "no-store" });
        const data = await res.json();
        setCurrentUser(data.users?.[0] || null);
      } catch (error) {
        console.error("Failed to load specialist user", error);
      } finally {
        setIsLoadingUser(false);
      }
    };

    loadUser();
  }, []);

  useEffect(() => {
    if (!consultationId) return;

    const loadConsultation = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/consultations/${consultationId}`, { cache: "no-store" });
        const data = await res.json();
        const item = data.consultation || null;
        setConsultation(item);
        setNotes(item?.notes || "");

        const athleteId = item?.athlete_id ?? item?.athleteId;
        if (athleteId) {
          const athleteRes = await fetch(`/api/users/${athleteId}`, { cache: "no-store" });
          const athleteData = await athleteRes.json();
          setAthlete(athleteData.user || null);
        }
      } catch (error) {
        console.error("Failed to load consultation", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadConsultation();
  }, [consultationId]);

  if (isLoadingUser) {
    return (
      <DashboardLayout role="specialist">
        <div className="text-muted-foreground">Loading consultation...</div>
      </DashboardLayout>
    );
  }

  if (!currentUser || currentUser.role !== "specialist") {
    return null;
  }

  if (isLoading) {
    return (
      <DashboardLayout role="specialist">
        <div className="text-muted-foreground">Loading consultation...</div>
      </DashboardLayout>
    );
  }

  if (!consultation) {
    return (
      <DashboardLayout role={currentUser.role}>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Consultation not found</p>
          <Button
            variant="outline"
            onClick={() => router.push("/specialist/consultations")}
            className="mt-4"
          >
            Back to Consultations
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const handleComplete = async () => {
    if (!consultation) return;
    await fetch(`/api/consultations/${consultation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed", notes: notes || consultation.notes }),
    });
    router.push("/specialist/consultations");
  };

  const handleCancel = async () => {
    if (!consultation) return;
    await fetch(`/api/consultations/${consultation.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });
    router.push("/specialist/consultations");
  };

  return (
    <DashboardLayout role={currentUser.role}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/specialist/consultations")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Consultation Details
            </h1>
            <p className="text-muted-foreground">
              {(consultation.type || "General")} consultation with {athlete?.name || "Unknown Athlete"}
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <User className="h-5 w-5 text-primary" />
                Athlete Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium text-foreground">
                  {athlete?.name || "Unknown Athlete"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Consultation Type
                </p>
                <Badge variant="outline" className="mt-1">
                  {consultation.type || "General"}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge
                  className={`mt-1 ${
                    consultation.status === "completed"
                      ? "bg-primary/20 text-primary"
                      : consultation.status === "scheduled"
                        ? "bg-accent/20 text-accent-foreground"
                        : "bg-destructive/20 text-destructive"
                  }`}
                >
                  {consultation.status}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Calendar className="h-5 w-5 text-primary" />
                Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium text-foreground">
                    {new Date(consultation.date).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Time</p>
                  <p className="font-medium text-foreground">
                    {consultation.time}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" className="flex-1">
                  <Video className="h-4 w-4 mr-2" />
                  Video Call
                </Button>
                <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                  <Phone className="h-4 w-4 mr-2" />
                  Phone
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <FileText className="h-5 w-5 text-primary" />
              Consultation Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="notes" className="text-foreground">
                Session Notes
              </Label>
              <Textarea
                id="notes"
                placeholder="Enter consultation notes, recommendations, and follow-up actions..."
                value={notes || consultation.notes || ""}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-2 min-h-[150px] bg-input border-border text-foreground"
              />
            </div>
            {consultation.status !== "completed" &&
              consultation.status !== "cancelled" && (
                <div className="flex gap-3">
                  <Button onClick={handleComplete} className="flex-1">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete Consultation
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleCancel}
                    className="flex-1"
                  >
                    Cancel Consultation
                  </Button>
                </div>
              )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

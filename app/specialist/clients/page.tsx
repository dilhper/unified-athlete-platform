"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Calendar, MessageSquare, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function ClientsPage() {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [athletes, setAthletes] = useState<Record<string, any>>({});
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        const data = await res.json();
        
        if (res.ok && data.user) {
          setCurrentUser(data.user);
        } else {
          console.error("Failed to load user:", data.error);
        }
      } catch (error) {
        console.error("Failed to load specialist user", error);
      } finally {
        setIsLoadingUser(false);
      }
    };

    loadUser();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const loadData = async () => {
      try {
        const [consultationsRes, athletesRes] = await Promise.all([
          fetch(`/api/consultations?specialistId=${currentUser.id}`, { cache: "no-store" }),
          fetch("/api/users?role=athlete&limit=200", { cache: "no-store" }),
        ]);

        const consultationsData = await consultationsRes.json();
        const athletesData = await athletesRes.json();

        const athleteMap: Record<string, any> = {};
        (athletesData.users || []).forEach((athlete: any) => {
          athleteMap[athlete.id] = athlete;
        });

        setConsultations(consultationsData.consultations || []);
        setAthletes(athleteMap);
      } catch (error) {
        console.error("Failed to load clients", error);
      }
    };

    loadData();
  }, [currentUser]);

  if (isLoadingUser) {
    return (
      <DashboardLayout role="specialist">
        <div className="text-muted-foreground">Loading clients...</div>
      </DashboardLayout>
    );
  }

  if (!currentUser || currentUser.role !== "specialist") {
    return null;
  }

  // Get unique clients from consultations
  const clientsMap = new Map<
    string,
    { id: string; name: string; consultations: number; lastVisit: string }
  >();
  consultations
    .filter((c) => (c.specialist_id ?? c.specialistId) === currentUser.id)
    .forEach((c) => {
      const athleteId = c.athlete_id ?? c.athleteId;
      const existing = clientsMap.get(athleteId);
      if (existing) {
        existing.consultations++;
        if (new Date(c.date) > new Date(existing.lastVisit)) {
          existing.lastVisit = c.date;
        }
      } else {
        clientsMap.set(athleteId, {
          id: athleteId,
          name: athletes[athleteId]?.name || "Unknown Athlete",
          consultations: 1,
          lastVisit: c.date,
        });
      }
    });

  const clients = Array.from(clientsMap.values()).filter((client) =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout role={currentUser.role}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Clients</h1>
            <p className="text-muted-foreground">
              Athletes you have consulted with
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-input border-border text-foreground"
            />
          </div>
        </div>

        {clients.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No clients found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {clients.map((client) => (
              <Card
                key={client.id}
                className="bg-card border-border hover:border-primary/50 transition-colors"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                        {client.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg text-foreground">
                        {client.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">Athlete</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Sessions
                    </span>
                    <Badge variant="secondary">{client.consultations}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Last Visit</span>
                    <span className="text-foreground">
                      {new Date(client.lastVisit).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" className="flex-1 bg-transparent">
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Message
                    </Button>
                    <Link href="/specialist/consultations" className="flex-1">
                      <Button size="sm" className="w-full">
                        <TrendingUp className="h-4 w-4 mr-1" />
                        History
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

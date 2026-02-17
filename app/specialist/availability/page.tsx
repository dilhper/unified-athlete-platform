"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, Save } from "lucide-react";
import { useEffect, useState } from "react";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const TIME_SLOTS = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
];

export default function AvailabilityPage() {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [availability, setAvailability] = useState<Record<string, string[]>>({
    Monday: ["09:00", "10:00", "11:00", "14:00", "15:00"],
    Tuesday: ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"],
    Wednesday: ["09:00", "10:00", "14:00", "15:00"],
    Thursday: ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"],
    Friday: ["09:00", "10:00", "11:00"],
    Saturday: [],
    Sunday: [],
  });
  const [enabledDays, setEnabledDays] = useState<Record<string, boolean>>({
    Monday: true,
    Tuesday: true,
    Wednesday: true,
    Thursday: true,
    Friday: true,
    Saturday: false,
    Sunday: false,
  });

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

  if (isLoadingUser) {
    return (
      <DashboardLayout role="specialist">
        <div className="text-muted-foreground">Loading availability...</div>
      </DashboardLayout>
    );
  }

  if (!currentUser || currentUser.role !== "specialist") {
    return null;
  }

  const toggleDay = (day: string) => {
    setEnabledDays((prev) => ({ ...prev, [day]: !prev[day] }));
    if (enabledDays[day]) {
      setAvailability((prev) => ({ ...prev, [day]: [] }));
    }
  };

  const toggleTimeSlot = (day: string, time: string) => {
    setAvailability((prev) => {
      const daySlots = prev[day] || [];
      if (daySlots.includes(time)) {
        return { ...prev, [day]: daySlots.filter((t) => t !== time) };
      } else {
        return { ...prev, [day]: [...daySlots, time].sort() };
      }
    });
  };

  const handleSave = () => {
    // In a real app, this would save to the backend
    alert("Availability saved successfully!");
  };

  return (
    <DashboardLayout role={currentUser.role}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Availability</h1>
            <p className="text-muted-foreground">
              Set your consultation availability
            </p>
          </div>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>

        <div className="grid gap-4">
          {DAYS.map((day) => (
            <Card key={day} className="bg-card border-border">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Calendar className="h-5 w-5 text-primary" />
                    {day}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor={`${day}-toggle`}
                      className="text-sm text-muted-foreground"
                    >
                      {enabledDays[day] ? "Available" : "Unavailable"}
                    </Label>
                    <Switch
                      id={`${day}-toggle`}
                      checked={enabledDays[day]}
                      onCheckedChange={() => toggleDay(day)}
                    />
                  </div>
                </div>
              </CardHeader>
              {enabledDays[day] && (
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {TIME_SLOTS.map((time) => {
                      const isSelected = availability[day]?.includes(time);
                      return (
                        <Button
                          key={time}
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleTimeSlot(day, time)}
                          className={
                            isSelected
                              ? ""
                              : "border-border text-muted-foreground hover:text-foreground"
                          }
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          {time}
                        </Button>
                      );
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

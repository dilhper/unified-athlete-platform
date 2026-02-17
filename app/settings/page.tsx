"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Settings,
  User,
  Bell,
  Shield,
  Palette,
  Save,
  Camera,
} from "lucide-react";
import { useState, useEffect } from "react";

export default function SettingsPage() {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    sms: false,
    marketing: false,
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetch("/api/users?limit=1", { cache: "no-store" });
        const data = await res.json();
        setCurrentUser(data.users?.[0] || null);
      } catch (error) {
        console.error("Failed to load user", error);
      } finally {
        setIsLoadingUser(false);
      }
    };

    loadUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      setFormData({
        name: currentUser.name || "",
        email: currentUser.email || "",
      });
    }
  }, [currentUser]);

  if (isLoadingUser) {
    return (
      <DashboardLayout role="athlete">
        <div className="text-muted-foreground">Loading settings...</div>
      </DashboardLayout>
    );
  }

  if (!currentUser) {
    return (
      <DashboardLayout role="athlete">
        <div className="text-muted-foreground">No user found.</div>
      </DashboardLayout>
    );
  }

  const handleSaveProfile = async () => {
    try {
      await fetch(`/api/users/${currentUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formData.name, email: formData.email }),
      });
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Failed to update profile", error);
    }
  };

  return (
    <DashboardLayout role={currentUser.role}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your account preferences
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="bg-secondary">
            <TabsTrigger value="profile" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <User className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="notifications" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="privacy" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Shield className="h-4 w-4 mr-2" />
              Privacy
            </TabsTrigger>
            <TabsTrigger value="appearance" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Palette className="h-4 w-4 mr-2" />
              Appearance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Profile Information</CardTitle>
                <CardDescription>Update your personal details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <Avatar className="h-20 w-20">
                      <AvatarFallback className="bg-primary/20 text-primary text-2xl font-semibold">
                        {currentUser.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full"
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{currentUser.name}</p>
                    <p className="text-sm text-muted-foreground capitalize">{currentUser.role}</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-foreground">Full Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="bg-input border-border text-foreground"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-foreground">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="bg-input border-border text-foreground"
                    />
                  </div>
                </div>

                <Button onClick={handleSaveProfile}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Notification Preferences</CardTitle>
                <CardDescription>Choose how you want to be notified</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {[
                  { key: "email", label: "Email Notifications", desc: "Receive updates via email" },
                  { key: "push", label: "Push Notifications", desc: "Receive push notifications on your device" },
                  { key: "sms", label: "SMS Notifications", desc: "Receive text message alerts" },
                  { key: "marketing", label: "Marketing Emails", desc: "Receive promotional content and offers" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch
                      checked={notifications[item.key as keyof typeof notifications]}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, [item.key]: checked })
                      }
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privacy">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Privacy Settings</CardTitle>
                <CardDescription>Control your data and visibility</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {[
                  { label: "Profile Visibility", desc: "Allow others to view your profile" },
                  { label: "Show Activity Status", desc: "Display when you're online" },
                  { label: "Share Statistics", desc: "Allow coaches to view your stats" },
                  { label: "Data Analytics", desc: "Help improve the platform with anonymous data" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{item.label}</p>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch defaultChecked={i < 2} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Appearance</CardTitle>
                <CardDescription>Customize the look and feel</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <p className="font-medium text-foreground">Theme</p>
                  <div className="flex gap-4">
                    {["Dark", "Light", "System"].map((theme) => (
                      <button
                        key={theme}
                        className={`px-4 py-2 rounded-lg border transition-colors ${
                          theme === "Dark"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/50"
                        }`}
                      >
                        {theme}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Compact Mode</p>
                    <p className="text-sm text-muted-foreground">Use smaller spacing and elements</p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">Animations</p>
                    <p className="text-sm text-muted-foreground">Enable UI animations and transitions</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

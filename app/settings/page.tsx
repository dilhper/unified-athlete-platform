"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Settings,
  User,
  Bell,
  Shield,
  Palette,
  Save,
  Camera,
  Edit,
  Upload,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";

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
  
  // Athlete profile fields
  const [athleteProfile, setAthleteProfile] = useState({
    athleteType: "",
    schoolClub: "",
    dateOfBirth: "",
    nationalRanking: "",
    district: "",
    trainingPlace: "",
  });
  
  // Profile change request dialog
  const [showChangeRequestDialog, setShowChangeRequestDialog] = useState(false);
  const [changeReason, setChangeReason] = useState("");
  const [supportingDocument, setSupportingDocument] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      
      // Load athlete-specific fields
      if (currentUser.role === 'athlete') {
        setAthleteProfile({
          athleteType: currentUser.athlete_type || "",
          schoolClub: currentUser.school_club || "",
          dateOfBirth: currentUser.date_of_birth || "",
          nationalRanking: currentUser.national_ranking?.toString() || "",
          district: currentUser.district || "",
          trainingPlace: currentUser.training_place || "",
        });
      }
    }
  }, [currentUser]);

  if (isLoadingUser) {
    return (
      <DashboardLayout role={currentUser?.role || "athlete"}>
        <div className="text-muted-foreground">Loading settings...</div>
      </DashboardLayout>
    );
  }

  if (!currentUser) {
    return (
      <DashboardLayout role="athlete">
        <div className="text-muted-foreground">Please log in to access settings.</div>
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
  
  const handleSubmitProfileChangeRequest = async () => {
    if (!changeReason.trim()) {
      alert("Please provide a reason for the changes");
      return;
    }
    
    if (!supportingDocument) {
      alert("Please upload a supporting document");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const formData = new FormData();
      formData.append('reason', changeReason);
      formData.append('document', supportingDocument);
      formData.append('requestedChanges', JSON.stringify({
        athleteType: athleteProfile.athleteType,
        schoolClub: athleteProfile.schoolClub,
        dateOfBirth: athleteProfile.dateOfBirth,
        nationalRanking: athleteProfile.nationalRanking ? parseInt(athleteProfile.nationalRanking) : null,
        district: athleteProfile.district,
        trainingPlace: athleteProfile.trainingPlace,
      }));
      
      const res = await fetch('/api/profile-change-requests', {
        method: 'POST',
        body: formData,
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to submit request');
      }
      
      alert('Profile change request submitted successfully! An official will review it shortly.');
      setShowChangeRequestDialog(false);
      setChangeReason("");
      setSupportingDocument(null);
    } catch (error: any) {
      console.error("Failed to submit profile change request:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsSubmitting(false);
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
            
            {/* Athlete-Specific Profile Information */}
            {currentUser.role === 'athlete' && (
              <Card className="bg-card border-border mt-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-foreground">Athlete Profile Details</CardTitle>
                      <CardDescription>
                        View your athlete information. To make changes, click "Request Update" and submit for official approval.
                      </CardDescription>
                    </div>
                    <Button onClick={() => setShowChangeRequestDialog(true)} variant="outline">
                      <Edit className="h-4 w-4 mr-2" />
                      Request Update
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-sm">Athlete Type</Label>
                      <p className="text-foreground font-medium capitalize">{currentUser.athlete_type || "Not specified"}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-sm">School/Club</Label>
                      <p className="text-foreground font-medium">{currentUser.school_club || "Not specified"}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-sm">Date of Birth</Label>
                      <p className="text-foreground font-medium">
                        {currentUser.date_of_birth ? new Date(currentUser.date_of_birth).toLocaleDateString() : "Not specified"}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-sm">National Ranking</Label>
                      <p className="text-foreground font-medium">
                        {currentUser.national_ranking ? `#${currentUser.national_ranking}` : "Unranked"}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-sm">District</Label>
                      <p className="text-foreground font-medium">{currentUser.district || "Not specified"}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground text-sm">Training Place</Label>
                      <p className="text-foreground font-medium">{currentUser.training_place || "Not specified"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
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
        
        {/* Profile Change Request Dialog */}
        <Dialog open={showChangeRequestDialog} onOpenChange={setShowChangeRequestDialog}>
          <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-foreground">Request Profile Update</DialogTitle>
              <DialogDescription>
                Update your athlete profile information. Changes require official approval.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* Editable Fields */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="athleteType">Athlete Type</Label>
                  <select
                    id="athleteType"
                    value={athleteProfile.athleteType}
                    onChange={(e) => setAthleteProfile({ ...athleteProfile, athleteType: e.target.value })}
                    className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground"
                  >
                    <option value="">Select type</option>
                    <option value="normal">Normal</option>
                    <option value="student">Student</option>
                    <option value="university">University</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="schoolClub">School/Club Name</Label>
                  <Input
                    id="schoolClub"
                    value={athleteProfile.schoolClub}
                    onChange={(e) => setAthleteProfile({ ...athleteProfile, schoolClub: e.target.value })}
                    placeholder="St. Joseph College"
                    className="bg-input border-border"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={athleteProfile.dateOfBirth}
                    onChange={(e) => setAthleteProfile({ ...athleteProfile, dateOfBirth: e.target.value })}
                    className="bg-input border-border"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="nationalRanking">National Ranking (Optional)</Label>
                  <Input
                    id="nationalRanking"
                    type="number"
                    value={athleteProfile.nationalRanking}
                    onChange={(e) => setAthleteProfile({ ...athleteProfile, nationalRanking: e.target.value })}
                    placeholder="e.g., 5"
                    min="1"
                    className="bg-input border-border"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="district">District</Label>
                  <Input
                    id="district"
                    value={athleteProfile.district}
                    onChange={(e) => setAthleteProfile({ ...athleteProfile, district: e.target.value })}
                    placeholder="Colombo"
                    className="bg-input border-border"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="trainingPlace">Training Place</Label>
                  <Input
                    id="trainingPlace"
                    value={athleteProfile.trainingPlace}
                    onChange={(e) => setAthleteProfile({ ...athleteProfile, trainingPlace: e.target.value })}
                    placeholder="National Stadium"
                    className="bg-input border-border"
                  />
                </div>
              </div>
              
              {/* Reason for Change */}
              <div className="space-y-2">
                <Label htmlFor="reason" className="text-foreground">
                  Reason for Changes <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="reason"
                  placeholder="Please explain why you need to update your profile information..."
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  className="bg-input border-border min-h-[100px]"
                  required
                />
              </div>
              
              {/* Document Upload */}
              <div className="space-y-2">
                <Label htmlFor="document" className="text-foreground">
                  Supporting Document <span className="text-red-500">*</span>
                </Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Upload a document to verify your profile changes (e.g., school ID, birth certificate, ranking certificate)
                </p>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-muted-foreground rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
                >
                  <input
                    ref={fileInputRef}
                    id="document"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setSupportingDocument(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">
                    {supportingDocument ? supportingDocument.name : 'Click to upload or drag and drop'}
                  </p>
                  {supportingDocument && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {(supportingDocument.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  )}
                  {!supportingDocument && (
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, JPG, PNG (Max 10MB)
                    </p>
                  )}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-4 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowChangeRequestDialog(false);
                    setChangeReason("");
                    setSupportingDocument(null);
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitProfileChangeRequest}
                  disabled={isSubmitting || !changeReason.trim() || !supportingDocument}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

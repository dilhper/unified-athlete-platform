"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  Check,
  CheckCheck,
  Trophy,
  Calendar,
  MessageSquare,
  AlertCircle,
  UserCheck,
  FileText,
} from "lucide-react";
import { useEffect, useState } from "react";

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "achievement":
      return <Trophy className="h-5 w-5 text-accent" />;
    case "schedule":
      return <Calendar className="h-5 w-5 text-chart-3" />;
    case "message":
      return <MessageSquare className="h-5 w-5 text-primary" />;
    case "verification":
      return <UserCheck className="h-5 w-5 text-chart-4" />;
    case "document":
      return <FileText className="h-5 w-5 text-muted-foreground" />;
    default:
      return <Bell className="h-5 w-5 text-muted-foreground" />;
  }
};

export default function NotificationsPage() {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        const data = await res.json();
        setCurrentUser(data.user || null);
      } catch (error) {
        console.error("Failed to load user", error);
      } finally {
        setIsLoadingUser(false);
      }
    };

    loadUser();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const loadNotifications = async () => {
      try {
        const res = await fetch(`/api/notifications?userId=${currentUser.id}`, { cache: "no-store" });
        const data = await res.json();
        setNotifications(data.notifications || []);
      } catch (error) {
        console.error("Failed to load notifications", error);
      }
    };

    loadNotifications();
  }, [currentUser]);

  if (isLoadingUser) {
    return (
      <DashboardLayout role="athlete">
        <div className="text-muted-foreground">Loading notifications...</div>
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

  const userNotifications = notifications.sort(
    (a, b) =>
      new Date(b.created_at ?? b.timestamp).getTime() -
      new Date(a.created_at ?? a.timestamp).getTime()
  );

  const unreadCount = userNotifications.filter((n) => !n.read).length;

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    }
  };

  const handleMarkAllRead = async () => {
    await Promise.all(userNotifications.filter((n) => !n.read).map((n) => markNotificationAsRead(n.id)));
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <DashboardLayout role={currentUser.role}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Bell className="h-6 w-6 text-primary" />
              Notifications
            </h1>
            <p className="text-muted-foreground">
              {unreadCount > 0
                ? `You have ${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
                : "All caught up!"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" onClick={handleMarkAllRead}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark All Read
            </Button>
          )}
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {userNotifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              <div className="space-y-1">
                {userNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-4 p-4 rounded-lg transition-colors cursor-pointer hover:bg-secondary/50 ${
                      !notification.read ? "bg-secondary/30" : ""
                    }`}
                    onClick={() => markNotificationAsRead(notification.id)}
                  >
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p
                            className={`text-foreground ${!notification.read ? "font-semibold" : ""}`}
                          >
                            {notification.title}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                          {notification.action_url && (
                            <a
                              href={notification.action_url}
                              className="inline-flex items-center text-sm text-primary mt-2 hover:underline"
                            >
                              Open
                            </a>
                          )}
                        </div>
                        {!notification.read && (
                          <Badge className="bg-primary text-primary-foreground flex-shrink-0">
                            New
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatTimestamp(notification.created_at ?? notification.timestamp)}
                      </p>
                    </div>
                    {notification.read && (
                      <Check className="h-4 w-4 text-primary flex-shrink-0 mt-1" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  Send,
  Paperclip,
  MoreVertical,
  Users,
  Plus,
} from "lucide-react";
import { useState, useEffect } from "react";

export default function MessagesPage() {
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [communities, setCommunities] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [communityMessages, setCommunityMessages] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCommunity, setSelectedCommunity] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");

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

    const loadData = async () => {
      try {
        const [communitiesRes, usersRes] = await Promise.all([
          fetch("/api/communities", { cache: "no-store" }),
          fetch("/api/users?limit=200", { cache: "no-store" }),
        ]);

        const communitiesData = await communitiesRes.json();
        const usersData = await usersRes.json();

        const normalizedCommunities = (communitiesData.communities || []).map((community: any) => ({
          ...community,
          memberIds: community.member_ids ?? community.memberIds ?? [],
          sport: community.sport ?? "General",
        }));

        setCommunities(normalizedCommunities);
        setUsers(usersData.users || []);
      } catch (error) {
        console.error("Failed to load messages data", error);
      }
    };

    loadData();
  }, [currentUser]);

  useEffect(() => {
    if (!selectedCommunity) {
      setCommunityMessages([]);
      return;
    }

    const loadMessages = async () => {
      try {
        const res = await fetch(`/api/messages?communityId=${selectedCommunity}`, { cache: "no-store" });
        const data = await res.json();
        const normalized = (data.messages || []).map((msg: any) => ({
          ...msg,
          senderId: msg.sender_id ?? msg.senderId,
          receiverId: msg.receiver_id ?? msg.receiverId,
          communityId: msg.community_id ?? msg.communityId,
          timestamp: msg.timestamp ?? msg.created_at ?? msg.createdAt,
        }));
        setCommunityMessages(normalized);
      } catch (error) {
        console.error("Failed to load community messages", error);
      }
    };

    loadMessages();
  }, [selectedCommunity]);

  if (isLoadingUser) {
    return (
      <DashboardLayout role="athlete">
        <div className="text-muted-foreground">Loading messages...</div>
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

  const visibleCommunities = currentUser.role === "specialist" || currentUser.role === "official"
    ? communities
    : communities.filter((community) => community.memberIds.includes(currentUser.id));
  const filteredCommunities = visibleCommunities.filter(community =>
    community.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    community.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedCommunityData = selectedCommunity
    ? communities.find(c => c.id === selectedCommunity)
    : null;

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedCommunity) return;

    // Check if user can send messages (athletes can only read)
    if (currentUser.role === 'athlete') {
      return; // Athletes cannot send messages
    }

    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        senderId: currentUser.id,
        communityId: selectedCommunity,
        content: newMessage.trim(),
      }),
    });
    const res = await fetch(`/api/messages?communityId=${selectedCommunity}`, { cache: "no-store" });
    const data = await res.json();
    const normalized = (data.messages || []).map((msg: any) => ({
      ...msg,
      senderId: msg.sender_id ?? msg.senderId,
      receiverId: msg.receiver_id ?? msg.receiverId,
      communityId: msg.community_id ?? msg.communityId,
      timestamp: msg.timestamp ?? msg.created_at ?? msg.createdAt,
    }));
    setCommunityMessages(normalized);
    setNewMessage("");
  };

  const handleSelectCommunity = (communityId: string) => {
    setSelectedCommunity(communityId);
  };

  const canSendMessages = currentUser.role !== 'athlete';

  return (
    <DashboardLayout role={currentUser.role}>
      <div className="flex h-[calc(100vh-8rem)] gap-4">
        {/* Communities Sidebar */}
        <Card className="w-80 flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Communities</CardTitle>
              {currentUser.role !== 'athlete' && (
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" />
                  New
                </Button>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search communities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-2">
                {filteredCommunities.map((community) => (
                  <div
                    key={community.id}
                    onClick={() => handleSelectCommunity(community.id)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedCommunity === community.id
                        ? "bg-primary/10 border border-primary/20"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          <Users className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-sm truncate">
                            {community.name}
                          </h3>
                          <Badge variant="secondary" className="text-xs">
                            {community.sport}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {community.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-muted-foreground">
                            {community.memberIds.length} members
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredCommunities.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No communities found</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Messages Area */}
        <Card className="flex-1 flex flex-col">
          {selectedCommunityData ? (
            <>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        <Users className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{selectedCommunityData.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {selectedCommunityData.memberIds.length} members • {selectedCommunityData.sport}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-0">
                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {communityMessages.map((message) => {
                      const sender = users.find(u => u.id === message.senderId);
                      const isCurrentUser = message.senderId === currentUser.id;

                      return (
                        <div
                          key={message.id}
                          className={`flex gap-3 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                        >
                          {!isCurrentUser && (
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {sender?.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <div
                            className={`max-w-[70%] rounded-lg px-3 py-2 ${
                              isCurrentUser
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            {!isCurrentUser && sender && (
                              <p className="text-xs font-medium mb-1">{sender.name}</p>
                            )}
                            <p className="text-sm">{message.content}</p>
                            <p className="text-xs opacity-70 mt-1">
                              {new Date(message.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          {isCurrentUser && (
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {currentUser.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                      );
                    })}
                    {communityMessages.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="text-sm">No messages yet. Start the conversation!</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                {/* Message Input */}
                {canSendMessages ? (
                  <div className="p-4 border-t">
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        className="min-h-[60px] resize-none"
                      />
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-10 w-10 p-0"
                        >
                          <Paperclip className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSendMessage}
                          disabled={!newMessage.trim()}
                          className="h-10 w-10 p-0"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 border-t bg-muted/50">
                    <p className="text-sm text-muted-foreground text-center">
                      Athletes can only read messages in communities. Contact your coach or specialist for direct communication.
                    </p>
                  </div>
                )}
              </CardContent>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Select a Community</h3>
                <p className="text-sm">Choose a community from the sidebar to start messaging</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}

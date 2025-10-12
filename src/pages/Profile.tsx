import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { profileService } from "@/services/profileService";
import { authService } from "@/services/authService";
import { notificationService } from "@/services/notificationService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { User, MessageSquare, ThumbsUp, Calendar, Clock, Mail, Edit2, Check, X } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { formatDistanceToNow } from "date-fns";
import DocumentLayout from "@/components/DocumentLayout";
import { getCurrentLanguage } from "@/lib/i18n";

const Profile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const currentUser = authService.getUser();
  const isOwner = currentUser?.id === userId;

  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState({
    displayName: "",
    bio: "",
    showEmail: false,
    emailNotifications: true,
    timeZone: "UTC"
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailFrequency: "none" as "immediate" | "hourly" | "daily" | "none",
    notifyOnCommentReply: true,
    notifyOnFollowedPageComment: true,
    notifyOnFollowedPageUpdate: true
  });

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => profileService.getProfile(userId!),
    enabled: !!userId
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["profileStats", userId],
    queryFn: () => profileService.getProfileStats(userId!),
    enabled: !!userId
  });

  const { data: notifSettings, isLoading: notifSettingsLoading } = useQuery({
    queryKey: ["notificationSettings"],
    queryFn: () => notificationService.getSettings(),
    enabled: isOwner && authService.isAuthenticated()
  });

  useEffect(() => {
    if (profile && isOwner) {
      setEditedProfile({
        displayName: profile.displayName || "",
        bio: profile.bio || "",
        showEmail: profile.showEmail ?? false,
        emailNotifications: profile.emailNotifications ?? true,
        timeZone: profile.timeZone || "UTC"
      });
    }
  }, [profile, isOwner]);

  useEffect(() => {
    if (notifSettings && isOwner) {
      setNotificationSettings({
        emailFrequency: notifSettings.emailFrequency,
        notifyOnCommentReply: notifSettings.notifyOnCommentReply,
        notifyOnFollowedPageComment: notifSettings.notifyOnFollowedPageComment,
        notifyOnFollowedPageUpdate: notifSettings.notifyOnFollowedPageUpdate
      });
    }
  }, [notifSettings, isOwner]);

  const updateProfileMutation = useMutation({
    mutationFn: (data: typeof editedProfile) => profileService.updateProfile(userId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      setIsEditing(false);
      toast.success(t("profile.updateSuccess"));
    },
    onError: () => {
      toast.error(t("profile.updateError"));
    }
  });

  const updateNotificationSettingsMutation = useMutation({
    mutationFn: (data: typeof notificationSettings) => notificationService.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificationSettings"] });
      toast.success(t("notifications.settingsUpdated"));
    },
    onError: () => {
      toast.error(t("notifications.settingsUpdateError"));
    }
  });

  const handleSave = () => {
    updateProfileMutation.mutate(editedProfile);
  };

  const handleSaveNotificationSettings = () => {
    updateNotificationSettingsMutation.mutate(notificationSettings);
  };

  const handleCancel = () => {
    if (profile) {
      setEditedProfile({
        displayName: profile.displayName || "",
        bio: profile.bio || "",
        showEmail: profile.showEmail ?? false,
        emailNotifications: profile.emailNotifications ?? true,
        timeZone: profile.timeZone || "UTC"
      });
    }
    setIsEditing(false);
  };

  if (profileLoading) {
    return (
      <DocumentLayout>
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-gray-200 rounded-lg"></div>
            <div className="h-64 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </DocumentLayout>
    );
  }

  if (!profile) {
    return (
      <DocumentLayout>
        <Alert>
          <AlertDescription>{t("profile.notFound")}</AlertDescription>
        </Alert>
      </DocumentLayout>
    );
  }

  return (
    <DocumentLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                  {profile.avatarUrl ? (
                    <img src={profile.avatarUrl} alt={profile.username} className="w-20 h-20 rounded-full" />
                  ) : (
                    <User className="w-10 h-10 text-primary" />
                  )}
                </div>
                <div>
                  {isEditing ? (
                    <div className="space-y-2">
                      <Input
                        value={editedProfile.displayName}
                        onChange={(e) => setEditedProfile({ ...editedProfile, displayName: e.target.value })}
                        placeholder={t("profile.displayNamePlaceholder")}
                        className="max-w-xs"
                      />
                      <p className="text-sm text-muted-foreground">@{profile.username}</p>
                    </div>
                  ) : (
                    <>
                      <CardTitle className="text-2xl">
                        {profile.displayName || profile.username}
                      </CardTitle>
                      {profile.displayName && (
                        <p className="text-sm text-muted-foreground">@{profile.username}</p>
                      )}
                    </>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {t("profile.memberSince")} {new Date(profile.createdAt).toLocaleDateString()}
                    </div>
                    {profile.lastSeenAt && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {t("profile.lastSeen")} {formatDistanceToNow(new Date(profile.lastSeenAt), { addSuffix: true })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {isOwner && !isEditing && (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  {t("profile.edit")}
                </Button>
              )}
              {isOwner && isEditing && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSave} disabled={updateProfileMutation.isPending}>
                    <Check className="w-4 h-4 mr-2" />
                    {t("profile.save")}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleCancel}>
                    <X className="w-4 h-4 mr-2" />
                    {t("profile.cancel")}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Bio */}
            {isEditing ? (
              <div>
                <Label>{t("profile.bio")}</Label>
                <Textarea
                  value={editedProfile.bio}
                  onChange={(e) => setEditedProfile({ ...editedProfile, bio: e.target.value })}
                  placeholder={t("profile.bioPlaceholder")}
                  maxLength={500}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {editedProfile.bio.length}/500
                </p>
              </div>
            ) : (
              profile.bio && (
                <p className="text-muted-foreground">{profile.bio}</p>
              )
            )}

            {/* Email */}
            {profile.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4" />
                {profile.email}
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{profile.totalComments}</div>
                <div className="text-sm text-muted-foreground">{t("profile.totalComments")}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{profile.totalVotesReceived}</div>
                <div className="text-sm text-muted-foreground">{t("profile.votesReceived")}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {stats?.activeDiscussions.length || 0}
                </div>
                <div className="text-sm text-muted-foreground">{t("profile.activeDiscussions")}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="activity" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="activity">{t("profile.activity")}</TabsTrigger>
            <TabsTrigger value="discussions">{t("profile.discussions")}</TabsTrigger>
            {isOwner && <TabsTrigger value="settings">{t("profile.settings")}</TabsTrigger>}
          </TabsList>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-4">
            {/* Most Popular Comment */}
            {stats?.mostPopularComment && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ThumbsUp className="w-5 h-5" />
                    {t("profile.mostPopularComment")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Link to={`/${getCurrentLanguage()}/${stats.mostPopularComment.pageSlug}`} className="block hover:bg-accent/50 rounded p-3 -m-3">
                    <p className="mb-2">{stats.mostPopularComment.content}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{stats.mostPopularComment.pageTitle}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3" />
                        {stats.mostPopularComment.voteScore}
                      </span>
                      <span>•</span>
                      <span>{formatDistanceToNow(new Date(stats.mostPopularComment.createdAt), { addSuffix: true })}</span>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Latest Comments */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  {t("profile.latestComments")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {statsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {t("common.loading")}
                  </div>
                ) : stats?.latestComments.length ? (
                  stats.latestComments.map((comment) => (
                    <Link
                      key={comment.id}
                      to={`/${getCurrentLanguage()}/${comment.chapterSlug}/${comment.pageSlug}`}
                      className="block p-3 rounded border hover:bg-accent/50 transition-colors"
                    >
                      <p className="mb-2 line-clamp-2">{comment.content}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{comment.pageTitle}</span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
                        {comment.voteScore !== 0 && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <ThumbsUp className="w-3 h-3" />
                              {comment.voteScore}
                            </span>
                          </>
                        )}
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {t("profile.noComments")}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Discussions Tab */}
          <TabsContent value="discussions">
            <Card>
              <CardHeader>
                <CardTitle>{t("profile.activeDiscussions")}</CardTitle>
                <CardDescription>{t("profile.activeDiscussionsDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {statsLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {t("common.loading")}
                  </div>
                ) : stats?.activeDiscussions.length ? (
                  stats.activeDiscussions.map((discussion) => (
                    <Link
                      key={discussion.pageId}
                      to={`/${getCurrentLanguage()}/${discussion.chapterSlug}/${discussion.pageSlug}`}
                      className="block p-4 rounded border hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">{discussion.pageTitle}</h3>
                        <span className="text-sm text-muted-foreground">
                          {discussion.commentCount} {t("profile.comments")}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t("profile.lastActivity")} {formatDistanceToNow(new Date(discussion.lastCommentAt), { addSuffix: true })}
                      </p>
                    </Link>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {t("profile.noDiscussions")}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          {isOwner && (
            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>{t("profile.settings")}</CardTitle>
                  <CardDescription>{t("profile.settingsDesc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{t("profile.showEmail")}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t("profile.showEmailDesc")}
                      </p>
                    </div>
                    <Switch
                      checked={editedProfile.showEmail}
                      onCheckedChange={(checked) =>
                        setEditedProfile({ ...editedProfile, showEmail: checked })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("profile.timeZone")}</Label>
                    <Input
                      value={editedProfile.timeZone}
                      onChange={(e) => setEditedProfile({ ...editedProfile, timeZone: e.target.value })}
                      placeholder="UTC"
                    />
                  </div>
                  <Button onClick={handleSave} disabled={updateProfileMutation.isPending} className="w-full">
                    {t("profile.saveSettings")}
                  </Button>
                </CardContent>
              </Card>

              {/* Notification Settings Card */}
              <Card>
                <CardHeader>
                  <CardTitle>{t("notifications.settings")}</CardTitle>
                  <CardDescription>{t("notifications.settingsDesc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>{t("notifications.emailFrequency")}</Label>
                    <Select
                      value={notificationSettings.emailFrequency}
                      onValueChange={(value: "immediate" | "hourly" | "daily" | "none") =>
                        setNotificationSettings({ ...notificationSettings, emailFrequency: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediate">{t("notifications.immediate")}</SelectItem>
                        <SelectItem value="hourly">{t("notifications.hourly")}</SelectItem>
                        <SelectItem value="daily">{t("notifications.daily")}</SelectItem>
                        <SelectItem value="none">{t("notifications.none")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      {t("notifications.emailFrequencyDesc")}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{t("notifications.notifyOnCommentReply")}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t("notifications.notifyOnCommentReplyDesc")}
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.notifyOnCommentReply}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({ ...notificationSettings, notifyOnCommentReply: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{t("notifications.notifyOnFollowedPageComment")}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t("notifications.notifyOnFollowedPageCommentDesc")}
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.notifyOnFollowedPageComment}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({ ...notificationSettings, notifyOnFollowedPageComment: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{t("notifications.notifyOnFollowedPageUpdate")}</Label>
                      <p className="text-sm text-muted-foreground">
                        {t("notifications.notifyOnFollowedPageUpdateDesc")}
                      </p>
                    </div>
                    <Switch
                      checked={notificationSettings.notifyOnFollowedPageUpdate}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({ ...notificationSettings, notifyOnFollowedPageUpdate: checked })
                      }
                    />
                  </div>

                  <Button
                    onClick={handleSaveNotificationSettings}
                    disabled={updateNotificationSettingsMutation.isPending}
                    className="w-full"
                  >
                    {t("profile.saveSettings")}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </DocumentLayout>
  );
};

export default Profile;

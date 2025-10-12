import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { notificationService } from "@/services/notificationService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import DocumentLayout from "@/components/DocumentLayout";
import { getCurrentLanguage } from "@/lib/i18n";
import { Notification } from "@/lib/api/types";

const Notifications = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["notifications", filter],
    queryFn: () => notificationService.getNotifications(1, 50, filter === "unread" ? true : undefined),
  });

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if unread
    if (!notification.isRead) {
      try {
        await notificationService.markAsRead(notification.id);
        refetch();
      } catch (error) {
        console.error("Failed to mark as read:", error);
      }
    }

    // Navigate to the page
    if (notification.page) {
      const currentLang = getCurrentLanguage();
      navigate(`/${currentLang}/${notification.page.chapterSlug}/${notification.page.slug}`);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      refetch();
      toast.success(t("notifications.allMarkedRead"));
    } catch (error) {
      toast.error(t("notifications.markAllReadError"));
    }
  };

  const handleClearRead = async () => {
    try {
      const result = await notificationService.clearReadNotifications();
      refetch();
      toast.success(t("notifications.clearedCount", { count: result.count }));
    } catch (error) {
      toast.error(t("notifications.clearError"));
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "CommentReply":
        return "💬";
      case "NewComment":
        return "💭";
      case "PageUpdate":
        return "📝";
      default:
        return "🔔";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return t("notifications.justNow");
    if (minutes < 60) return t("notifications.minutesAgoShort", { minutes: minutes });
    if (hours < 24) return t("notifications.hoursAgoShort", { hours: hours });
    if (days < 7) return t("notifications.daysAgoShort", { days: days });
    return date.toLocaleDateString();
  };

  return (
    <DocumentLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t("notifications.title")}</CardTitle>
                <CardDescription>
                  {data?.unreadCount ? `${data.unreadCount} ${t("notifications.unread")}` : t("notifications.noUnread")}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {data && data.unreadCount > 0 && (
                  <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
                    {t("notifications.markAllRead")}
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleClearRead}>
                  {t("notifications.clearRead")}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "unread")}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="all">{t("notifications.all")}</TabsTrigger>
                <TabsTrigger value="unread">
                  {t("notifications.unread")} {data?.unreadCount ? `(${data.unreadCount})` : ""}
                </TabsTrigger>
              </TabsList>

              <TabsContent value={filter} className="space-y-2">
                {isLoading ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {t("notifications.loading")}
                  </div>
                ) : !data?.notifications.length ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {t("notifications.empty")}
                  </div>
                ) : (
                  data.notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "p-4 rounded-lg border cursor-pointer transition-colors hover:bg-accent/50",
                        !notification.isRead && "bg-blue-50/50 dark:bg-blue-950/10 border-blue-200 dark:border-blue-800"
                      )}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex gap-4">
                        <div className="text-3xl flex-shrink-0">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h3 className="font-semibold text-sm">{notification.title}</h3>
                            {!notification.isRead && (
                              <span className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{formatDate(notification.createdAt)}</span>
                            {notification.page && (
                              <>
                                <span>•</span>
                                <span className="truncate">
                                  {notification.page.title}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DocumentLayout>
  );
};

export default Notifications;

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { notificationService } from "@/services/notificationService";
import { Notification } from "@/lib/api/types";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getCurrentLanguage } from "@/lib/i18n";

const NotificationBell = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch unread count
  const fetchUnreadCount = async () => {
    try {
      const { unreadCount: count } = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
    }
  };

  // Fetch recent notifications
  const fetchNotifications = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const response = await notificationService.getNotifications(1, 5);
      setNotifications(response.notifications);
      setUnreadCount(response.unreadCount);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      toast.error(t("notifications.fetchError"));
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch unread count on mount and set up polling
  useEffect(() => {
    fetchUnreadCount();

    // Poll every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const handleMarkAsRead = async (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationService.markAsRead(notificationId);
      await fetchNotifications();
    } catch (error) {
      console.error("Failed to mark as read:", error);
      toast.error(t("notifications.markReadError"));
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      await fetchNotifications();
      toast.success(t("notifications.allMarkedRead"));
    } catch (error) {
      console.error("Failed to mark all as read:", error);
      toast.error(t("notifications.markAllReadError"));
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if unread
    if (!notification.isRead) {
      notificationService.markAsRead(notification.id).catch(console.error);
    }

    // Navigate to the page with current language
    if (notification.page) {
      const currentLang = getCurrentLanguage();
      navigate(`/${currentLang}/${notification.page.chapterSlug}/${notification.page.slug}`);
      setIsOpen(false);
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
    if (minutes < 60) return t("notifications.minutesAgo", { count: minutes });
    if (hours < 24) return t("notifications.hoursAgo", { count: hours });
    if (days < 7) return t("notifications.daysAgo", { count: days });
    return date.toLocaleDateString();
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[380px] p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-sm">{t("notifications.title")}</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={handleMarkAllAsRead}
            >
              {t("notifications.markAllRead")}
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {t("notifications.loading")}
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              {t("notifications.empty")}
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-4 cursor-pointer transition-colors hover:bg-muted/50",
                    !notification.isRead && "bg-blue-50/50 dark:bg-blue-950/10"
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex gap-3">
                    <div className="text-2xl flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-medium text-sm leading-tight">
                          {notification.title}
                        </p>
                        {!notification.isRead && (
                          <button
                            onClick={(e) => handleMarkAsRead(notification.id, e)}
                            className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full hover:bg-blue-600 transition-colors"
                            title={t("notifications.markAsRead")}
                          />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-2 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center text-xs"
            onClick={() => {
              const currentLang = getCurrentLanguage();
              navigate(`/${currentLang}/notifications`);
              setIsOpen(false);
            }}
          >
            {t("notifications.viewAll")}
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationBell;

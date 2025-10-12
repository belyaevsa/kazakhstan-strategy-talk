import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notificationService } from "@/services/notificationService";
import { authService } from "@/services/authService";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";

interface FollowButtonProps {
  pageId: string;
  className?: string;
}

const FollowButton = ({ pageId, className }: FollowButtonProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const isAuthenticated = authService.isAuthenticated();

  // Check if user is following this page
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkStatus = async () => {
      try {
        const { isFollowing: following } = await notificationService.getFollowingStatus(pageId);
        setIsFollowing(following);
      } catch (error) {
        console.error("Failed to check follow status:", error);
      }
    };

    checkStatus();
  }, [pageId, isAuthenticated]);

  const handleToggleFollow = async () => {
    if (!isAuthenticated) {
      toast.error(t("follow.signInRequired"));
      navigate("/auth");
      return;
    }

    setIsLoading(true);
    try {
      if (isFollowing) {
        await notificationService.unfollowPage(pageId);
        setIsFollowing(false);
        toast.success(t("follow.unfollowed"));
      } else {
        await notificationService.followPage(pageId);
        setIsFollowing(true);
        toast.success(t("follow.followed"));
      }
    } catch (error: any) {
      console.error("Failed to toggle follow:", error);
      toast.error(error.message || t("follow.error"));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Button
      onClick={handleToggleFollow}
      variant={isFollowing ? "default" : "ghost"}
      size="icon"
      disabled={isLoading}
      className={cn(className)}
      title={isFollowing ? t("follow.unfollow") : t("follow.follow")}
    >
      <Heart
        className={cn(
          "h-4 w-4",
          isFollowing && "fill-current"
        )}
      />
    </Button>
  );
};

export default FollowButton;

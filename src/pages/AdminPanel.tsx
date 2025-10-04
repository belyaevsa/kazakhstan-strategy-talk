import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminService } from "@/services/adminService";
import { chapterService } from "@/services/chapterService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { authService } from "@/services/authService";
import DocumentLayout from "@/components/DocumentLayout";
import { Shield, Users, MessageSquare, ExternalLink } from "lucide-react";

const AdminPanel = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [emailFilter, setEmailFilter] = useState("");
  const [pageFilter, setPageFilter] = useState<string>("all");

  const isAdmin = authService.isAdmin();

  if (!isAdmin) {
    navigate("/");
    return null;
  }

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["admin-users", emailFilter],
    queryFn: () => adminService.getUsers(emailFilter || undefined),
  });

  const { data: comments, isLoading: commentsLoading } = useQuery({
    queryKey: ["admin-comments", pageFilter],
    queryFn: () => adminService.getComments(pageFilter === "all" ? undefined : pageFilter),
  });

  const { data: chapters } = useQuery({
    queryKey: ["chapters"],
    queryFn: () => chapterService.getAll(true),
  });

  const freezeMutation = useMutation({
    mutationFn: ({ userId, freezeUntil }: { userId: string; freezeUntil: Date }) =>
      adminService.freezeUser(userId, freezeUntil),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User frozen successfully");
    },
    onError: () => toast.error("Failed to freeze user"),
  });

  const unfreezeMutation = useMutation({
    mutationFn: (userId: string) => adminService.unfreezeUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User unfrozen successfully");
    },
    onError: () => toast.error("Failed to unfreeze user"),
  });

  const blockMutation = useMutation({
    mutationFn: (userId: string) => adminService.blockUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User blocked successfully");
    },
    onError: () => toast.error("Failed to block user"),
  });

  const unblockMutation = useMutation({
    mutationFn: (userId: string) => adminService.unblockUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User unblocked successfully");
    },
    onError: () => toast.error("Failed to unblock user"),
  });

  const handleFreeze = (userId: string) => {
    const freezeUntil = new Date();
    freezeUntil.setHours(freezeUntil.getHours() + 24);
    freezeMutation.mutate({ userId, freezeUntil });
  };

  const allPages = chapters?.flatMap((c) => c.pages) || [];

  return (
    <DocumentLayout>
      <div className="bg-card rounded-lg shadow-sm border p-8">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Admin Panel</h1>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="comments" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Comments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <div className="flex gap-3">
              <Input
                placeholder="Search by email..."
                value={emailFilter}
                onChange={(e) => setEmailFilter(e.target.value)}
                className="max-w-sm"
              />
            </div>

            {usersLoading ? (
              <p>Loading users...</p>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead>Last Comment</TableHead>
                      <TableHead>Frozen Until</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.map((user) => {
                      const isFrozen = user.frozenUntil && new Date(user.frozenUntil) > new Date();
                      return (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.username}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            {user.lastCommentAt
                              ? new Date(user.lastCommentAt).toLocaleString()
                              : "Never"}
                          </TableCell>
                          <TableCell>
                            {isFrozen ? (
                              <Badge variant="destructive">
                                {new Date(user.frozenUntil!).toLocaleString()}
                              </Badge>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            {user.isBlocked ? (
                              <Badge variant="destructive">Blocked</Badge>
                            ) : (
                              <Badge variant="secondary">Active</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {isFrozen ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => unfreezeMutation.mutate(user.id)}
                                  disabled={unfreezeMutation.isPending}
                                >
                                  Unfreeze
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleFreeze(user.id)}
                                  disabled={freezeMutation.isPending}
                                >
                                  Freeze 24h
                                </Button>
                              )}
                              {user.isBlocked ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => unblockMutation.mutate(user.id)}
                                  disabled={unblockMutation.isPending}
                                >
                                  Unblock
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => blockMutation.mutate(user.id)}
                                  disabled={blockMutation.isPending}
                                >
                                  Block
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="comments" className="space-y-4">
            <div className="flex gap-3">
              <Select value={pageFilter} onValueChange={setPageFilter}>
                <SelectTrigger className="max-w-sm">
                  <SelectValue placeholder="Filter by page" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All pages</SelectItem>
                  {allPages.map((page) => (
                    <SelectItem key={page.id} value={page.id}>
                      {page.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {commentsLoading ? (
              <p>Loading comments...</p>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Author</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Content</TableHead>
                      <TableHead>Page</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comments?.map((comment) => {
                      const pageUrl = comment.pageSlug ? `/document/${comment.pageSlug}` : null;
                      const paragraphUrl = comment.pageSlug && comment.paragraphId
                        ? `/document/${comment.pageSlug}#paragraph-${comment.paragraphId}`
                        : null;

                      return (
                        <TableRow key={comment.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{comment.authorName}</div>
                              <div className="text-xs text-muted-foreground">{comment.authorEmail}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {new Date(comment.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell className="max-w-md">
                            <p className="truncate">{comment.content}</p>
                          </TableCell>
                          <TableCell>
                            {pageUrl ? (
                              <div className="space-y-1">
                                <a
                                  href={pageUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-sm text-primary hover:underline"
                                >
                                  {comment.pageTitle}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                                {paragraphUrl && (
                                  <a
                                    href={paragraphUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary hover:underline"
                                  >
                                    Go to paragraph
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                )}
                              </div>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{comment.ipAddress || "-"}</TableCell>
                          <TableCell>
                            {comment.isDeleted ? (
                              <Badge variant="destructive">Deleted</Badge>
                            ) : (
                              <Badge variant="secondary">Active</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DocumentLayout>
  );
};

export default AdminPanel;

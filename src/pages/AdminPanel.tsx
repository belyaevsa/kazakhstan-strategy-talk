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
import { useNavigate, Link } from "react-router-dom";
import { authService } from "@/services/authService";
import DocumentLayout from "@/components/DocumentLayout";
import { Shield, Users, MessageSquare, ExternalLink, UserCircle, Mail, MailCheck, Clock, MapPin, Award, Settings, Plus, Trash2, Save } from "lucide-react";
import { getCurrentLanguage } from "@/lib/i18n";

const AdminPanel = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [emailFilter, setEmailFilter] = useState("");
  const [pageFilter, setPageFilter] = useState<string>("all");
  const [newSetting, setNewSetting] = useState({ key: "", value: "", description: "" });
  const [editingSettings, setEditingSettings] = useState<Record<string, { value: string; description: string }>>({});

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

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => adminService.getSettings(),
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

  const assignRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      adminService.assignRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Role assigned successfully");
    },
    onError: () => toast.error("Failed to assign role"),
  });

  const removeRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      adminService.removeRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Role removed successfully");
    },
    onError: () => toast.error("Failed to remove role"),
  });

  const updateSettingMutation = useMutation({
    mutationFn: ({ key, value, description }: { key: string; value: string; description?: string }) =>
      adminService.updateSetting(key, value, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      toast.success("Setting updated successfully");
      setEditingSettings({});
    },
    onError: () => toast.error("Failed to update setting"),
  });

  const createSettingMutation = useMutation({
    mutationFn: ({ key, value, description }: { key: string; value: string; description?: string }) =>
      adminService.createSetting(key, value, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      toast.success("Setting created successfully");
      setNewSetting({ key: "", value: "", description: "" });
    },
    onError: () => toast.error("Failed to create setting"),
  });

  const deleteSettingMutation = useMutation({
    mutationFn: (key: string) => adminService.deleteSetting(key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      toast.success("Setting deleted successfully");
    },
    onError: () => toast.error("Failed to delete setting"),
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="comments" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Comments
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
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
              <div className="space-y-4">
                {users?.map((user) => {
                  const isFrozen = user.frozenUntil && new Date(user.frozenUntil) > new Date();
                  const availableRoles = ["Viewer", "Editor", "Admin"];

                  return (
                    <div key={user.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <Link to={`/profile/${user.id}`}>
                              <Button variant="ghost" size="sm" className="gap-2 px-2">
                                <UserCircle className="h-5 w-5" />
                                <div className="text-left">
                                  <div className="font-semibold">{user.username}</div>
                                  {user.displayName && (
                                    <div className="text-xs text-muted-foreground">{user.displayName}</div>
                                  )}
                                </div>
                              </Button>
                            </Link>
                            <div className="flex items-center gap-1.5">
                              {user.emailVerified ? (
                                <span title="Email verified">
                                  <MailCheck className="h-4 w-4 text-green-600" />
                                </span>
                              ) : (
                                <span title="Email not verified">
                                  <Mail className="h-4 w-4 text-muted-foreground" />
                                </span>
                              )}
                              <span className="text-sm">{user.email}</span>
                            </div>
                          </div>

                          {user.bio && (
                            <p className="text-sm text-muted-foreground line-clamp-2">{user.bio}</p>
                          )}

                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Joined {new Date(user.createdAt).toLocaleDateString()}
                            </div>
                            {user.lastSeenAt && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Last seen {new Date(user.lastSeenAt).toLocaleString()}
                              </div>
                            )}
                            {user.lastCommentAt && (
                              <div className="flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                Last comment {new Date(user.lastCommentAt).toLocaleString()}
                              </div>
                            )}
                            {user.registrationIp && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {user.registrationIp}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <Award className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">Roles:</span>
                            </div>
                            {user.roles.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {user.roles.map((role) => (
                                  <Badge key={role} variant="default" className="gap-1">
                                    {role}
                                    <button
                                      onClick={() => removeRoleMutation.mutate({ userId: user.id, role })}
                                      className="hover:text-destructive"
                                      disabled={removeRoleMutation.isPending}
                                    >
                                      ×
                                    </button>
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <Badge variant="outline">No roles</Badge>
                            )}
                            <Select
                              onValueChange={(role) => assignRoleMutation.mutate({ userId: user.id, role })}
                              disabled={assignRoleMutation.isPending}
                            >
                              <SelectTrigger className="w-[120px] h-7">
                                <SelectValue placeholder="Add role" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableRoles
                                  .filter((role) => !user.roles.includes(role))
                                  .map((role) => (
                                    <SelectItem key={role} value={role}>
                                      {role}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 ml-4">
                          {isFrozen && (
                            <Badge variant="destructive" className="whitespace-nowrap">
                              Frozen until {new Date(user.frozenUntil!).toLocaleString()}
                            </Badge>
                          )}
                          {user.isBlocked && <Badge variant="destructive">Blocked</Badge>}

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
                        </div>
                      </div>
                    </div>
                  );
                })}
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
                      const currentLang = getCurrentLanguage();
                      const pageUrl = comment.chapterSlug && comment.pageSlug
                        ? `/${currentLang}/${comment.chapterSlug}/${comment.pageSlug}`
                        : comment.pageSlug
                        ? `/${currentLang}/${comment.pageSlug}`
                        : null;
                      const paragraphUrl = pageUrl && comment.paragraphId
                        ? `${pageUrl}#paragraph-${comment.paragraphId}`
                        : null;

                      return (
                        <TableRow key={comment.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <Link to={`/profile/${comment.authorId}`} className="font-medium hover:text-primary hover:underline">
                                {comment.authorName}
                              </Link>
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

          <TabsContent value="settings" className="space-y-4">
            <div className="border rounded-lg p-4 bg-muted/30">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add New Setting
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input
                  placeholder="Key (e.g., site.name)"
                  value={newSetting.key}
                  onChange={(e) => setNewSetting({ ...newSetting, key: e.target.value })}
                />
                <Input
                  placeholder="Value"
                  value={newSetting.value}
                  onChange={(e) => setNewSetting({ ...newSetting, value: e.target.value })}
                />
                <Input
                  placeholder="Description (optional)"
                  value={newSetting.description}
                  onChange={(e) => setNewSetting({ ...newSetting, description: e.target.value })}
                />
              </div>
              <Button
                className="mt-3"
                size="sm"
                onClick={() => createSettingMutation.mutate(newSetting)}
                disabled={!newSetting.key || !newSetting.value || createSettingMutation.isPending}
              >
                <Plus className="h-4 w-4 mr-1" />
                Create Setting
              </Button>
            </div>

            {settingsLoading ? (
              <p>Loading settings...</p>
            ) : (
              <div className="space-y-3">
                {settings?.map((setting) => {
                  const isEditing = editingSettings[setting.key];
                  const displayValue = isEditing?.value ?? setting.value;
                  const displayDescription = isEditing?.description ?? setting.description ?? "";

                  return (
                    <div key={setting.key} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="font-mono font-semibold text-sm">{setting.key}</div>
                          {isEditing ? (
                            <div className="space-y-2">
                              <Input
                                value={displayValue}
                                onChange={(e) =>
                                  setEditingSettings({
                                    ...editingSettings,
                                    [setting.key]: { value: e.target.value, description: displayDescription },
                                  })
                                }
                                placeholder="Value"
                              />
                              <Input
                                value={displayDescription}
                                onChange={(e) =>
                                  setEditingSettings({
                                    ...editingSettings,
                                    [setting.key]: { value: displayValue, description: e.target.value },
                                  })
                                }
                                placeholder="Description (optional)"
                              />
                            </div>
                          ) : (
                            <>
                              <div className="text-sm font-medium">{setting.value}</div>
                              {setting.description && (
                                <div className="text-xs text-muted-foreground">{setting.description}</div>
                              )}
                            </>
                          )}
                          <div className="text-xs text-muted-foreground">
                            Updated: {new Date(setting.updatedAt).toLocaleString()}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {isEditing ? (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => {
                                  updateSettingMutation.mutate({
                                    key: setting.key,
                                    value: displayValue,
                                    description: displayDescription || undefined,
                                  });
                                }}
                                disabled={updateSettingMutation.isPending}
                              >
                                <Save className="h-4 w-4 mr-1" />
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const newEditingSettings = { ...editingSettings };
                                  delete newEditingSettings[setting.key];
                                  setEditingSettings(newEditingSettings);
                                }}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setEditingSettings({
                                    ...editingSettings,
                                    [setting.key]: { value: setting.value, description: setting.description ?? "" },
                                  })
                                }
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  if (confirm(`Delete setting "${setting.key}"?`)) {
                                    deleteSettingMutation.mutate(setting.key);
                                  }
                                }}
                                disabled={deleteSettingMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DocumentLayout>
  );
};

export default AdminPanel;

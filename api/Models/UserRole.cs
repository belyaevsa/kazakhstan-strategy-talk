namespace KazakhstanStrategyApi.Models;

public enum UserRole
{
    Viewer,   // Can comment and vote
    Editor,   // Can edit documents, manage pages
    Admin     // Can delete comments, block users
}

namespace KazakhstanStrategyApi.Models;

public enum ParagraphType
{
    Text,       // Regular text paragraph
    Header,     // Header/title
    Image,      // Image with optional caption
    Quote,      // Blockquote
    Code,       // Code block
    List,       // List (bulleted or numbered)
    Table,      // Table in Markdown format
    Link,       // Internal link to another page
    Divider,    // Horizontal divider for visual separation
    Callout     // Callout box for highlighting important content
}

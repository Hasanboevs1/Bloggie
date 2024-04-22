namespace Bloggie.Models
{
    public class Post
    {
        public int Id { get; set; }
        public string Title { get; set; }
        public string ShortDescription { get; set; }
        // Relation
        public string UserId { get; set; }
        public User User { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public string Description { get; set; }
        public string Slug { get; set; }
        public string ThumbnailUrl { get; set; }


    }
}

using Bloggie.Models;
using X.PagedList;

namespace Bloggie.ViewModels
{
    public class HomeVM
    {
        public string Title { get; set; }
        public string ShortDescription { get; set; }
        public string ThumbnailUrl { get; set; }
        public IPagedList<Post> Posts { get; set; }
    }
}

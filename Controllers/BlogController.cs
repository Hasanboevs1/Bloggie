using AspNetCoreHero.ToastNotification.Abstractions;
using Bloggie.Data;
using Bloggie.ViewModels;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Bloggie.Controllers
{
    public class BlogController : Controller
    {
        private readonly AppDbContext _context;
        public INotyfService _notification { get; }

        public BlogController(AppDbContext context, INotyfService notification)
        {
            _context = context;
            _notification = notification;
        }

        [HttpGet("[controller]/{slug}")]
        public IActionResult Post(string slug)
        {
            if (slug == "")
            {
                _notification.Error("Post not found");
                return View();
            }
            var post = _context.Posts!.Include(x => x.User).FirstOrDefault(x => x.Slug == slug);
            if (post == null)
            {
                _notification.Error("Post not found");
                return View();
            }
            var vm = new BlogPostVM()
            {
                Id = post.Id,
                Title = post.Title,
                AuthorName = post.User!.FirstName + " " + post.User.LastName,
                CreatedDate = post.CreatedAt,
                ThumbnailUrl = post.ThumbnailUrl,
                Description = post.Description,
                ShortDescription = post.ShortDescription,
            };
            return View(vm);
        }
    }
}

using Bloggie.Data;
using Bloggie.Models;
using Bloggie.ViewModels;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Diagnostics;
using X.PagedList;

namespace Bloggie.Controllers
{
    public class HomeController : Controller
    {
        private readonly ILogger<HomeController> _logger;
        private readonly AppDbContext _context;

        public HomeController(ILogger<HomeController> logger,
                                AppDbContext context)
        {
            _logger = logger;
            _context = context;
        }

        public async Task<IActionResult> Index(int? page)
        {
            var vm = new HomeVM();
            var setting = await _context.Settings!.ToListAsync(); // Ensure to await the async operation
            if (setting.Count > 0)
            {
                vm.Title = setting[0].Title;
                vm.ShortDescription = setting[0].ShortDescription;
                vm.ThumbnailUrl = setting[0].ThumbnailUrl;
            }
            else
            {
                // Handle the case where no settings are found, perhaps set default values for the view model
                vm.Title = "Default Title";
                vm.ShortDescription = "Default Short Description";
                vm.ThumbnailUrl = "Default Thumbnail Url";
            }

            int pageSize = 4;
            int pageNumber = (page ?? 1);
            vm.Posts = await _context.Posts!
                          .Include(x => x.User)
                          .OrderByDescending(x => x.CreatedAt)
                          .ToPagedListAsync(pageNumber, pageSize);

            return View(vm);
        }

        public IActionResult Privacy()
        {
            return View();
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}

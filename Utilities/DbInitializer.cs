using Bloggie.Data;
using Bloggie.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Bloggie.Utilities
{
    public class DbInitializer : IDbInitializer
    {
        private readonly AppDbContext _db;
        private readonly UserManager<User> _userManager;
        private readonly RoleManager<IdentityRole> _roleManager;
        public DbInitializer(AppDbContext db, UserManager<User> userManager, RoleManager<IdentityRole> roleManager)
        {
            _db = db;
            _userManager = userManager;
            _roleManager = roleManager;
        }

        public void Initialize()
        {
            if(!_roleManager.RoleExistsAsync(Roles.Admin).GetAwaiter().GetResult()) 
            {
                _roleManager.CreateAsync(new IdentityRole(Roles.Admin)).GetAwaiter().GetResult();     
                _roleManager.CreateAsync(new IdentityRole(Roles.Author)).GetAwaiter().GetResult();
                _userManager.CreateAsync(new User
                {
                    UserName = "admin",
                    Email = "admin@gmail.com",
                    FirstName = "Main",
                    LastName = "Admin"
                }, "Admin@0001").Wait();

                var appUser = _db.Users!.FirstOrDefault(x => x.Email == "admin@gmail.com");
                if(appUser != null)
                {
                    _userManager.AddToRoleAsync(appUser, Roles.Admin).GetAwaiter().GetResult();
                }

                var listOfPages = new List<Page>
                {
                    new Page
                    {
                        Title = "About Us",
                        Slug = "about"
                    },
                    new Page
                    {
                        Title = "Contact Us",
                        Slug = "contact"
                    },
                    new Page
                    {
                        Title = "Privacy Policy",
                        Slug = "privacy"
                    }
                };

                _db.Pages.AddRange(listOfPages);

                var setting = new Setting
                {
                    SiteName = "Site Name",
                    Title = "Site Title",
                    ShortDescription = "Short Description"
                };

                _db.Settings!.Add(setting);
                _db.SaveChanges();
            }
        }
    }
}

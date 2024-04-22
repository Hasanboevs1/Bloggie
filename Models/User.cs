using Microsoft.AspNetCore.Identity;

namespace Bloggie.Models
{
    public class User : IdentityUser
    {
        public string FirstName { get; set; }
        public string LastName { get; set; }
        // relations
        public List<Post> Posts { get; set; }
    }
}

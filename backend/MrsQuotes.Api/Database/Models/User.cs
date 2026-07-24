namespace MrsQuotes.Api.Database.Models;

public sealed class User
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public string Role { get; set; } = "";
    public int? QuoteAdministratorId { get; set; }
    public User? QuoteAdministrator { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    public List<User> AssignedAssessors { get; set; } = new();
    public List<Appointment> Appointments { get; set; } = new();
    public List<Quote> Quotes { get; set; } = new();
}

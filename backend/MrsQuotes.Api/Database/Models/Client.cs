namespace MrsQuotes.Api.Database.Models;

public sealed class Client
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public bool Active { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    public List<Appointment> Appointments { get; set; } = new();
    public List<Quote> Quotes { get; set; } = new();
}

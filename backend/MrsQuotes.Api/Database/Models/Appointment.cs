namespace MrsQuotes.Api.Database.Models;

public sealed class Appointment
{
    public int Id { get; set; }
    public int AssessorId { get; set; }
    public User Assessor { get; set; } = null!;
    public int ClientId { get; set; }
    public Client Client { get; set; } = null!;
    public string CustomerName { get; set; } = "";
    public string SiteAddress { get; set; } = "";
    public string RequestDetails { get; set; } = "";
    public DateTime AppointmentStart { get; set; }
    public DateTime? AppointmentEnd { get; set; }
    public string Status { get; set; } = "scheduled";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public Quote? Quote { get; set; }
}

package schedule

// Course represents a single scheduled class session in the USST timetable.
type Course struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Teacher     string `json:"teacher"`
	Location    string `json:"location"`
	RawLocation string `json:"rawLocation,omitempty"`
	DayOfWeek   int    `json:"dayOfWeek"`   // 1 = Monday ... 7 = Sunday
	StartPeriod int    `json:"startPeriod"` // 1 .. 12
	EndPeriod   int    `json:"endPeriod"`   // 1 .. 12
	Weeks       []int  `json:"weeks"`       // e.g. [1, 2, 3, ..., 16]
	WeeksText   string `json:"weeksText,omitempty"`
	WeekType    string `json:"weekType"`   // "all" | "odd" | "even"
	ColorIndex  int    `json:"colorIndex"` // 0..4 Morandi mineral palette index
	Notes       string `json:"notes,omitempty"`
}

// ParseResponse is returned by POST /api/parse-schedule.
type ParseResponse struct {
	Term     string   `json:"term,omitempty"`
	Courses  []Course `json:"courses"`
	Warnings []string `json:"warnings,omitempty"`
}

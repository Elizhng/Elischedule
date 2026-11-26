package schedule

import (
	"fmt"
	"hash/fnv"
	"regexp"
	"sort"
	"strconv"
	"strings"
)

var usstBuildingReplacements = []struct {
	full  string
	short string
}{
	{"第一教学楼", "一教"},
	{"第二教学楼", "二教"},
	{"第三教学楼", "三教"},
	{"第四教学楼", "四教"},
	{"第五教学楼", "五教"},
	{"光电信息大楼", "光电"},
	{"光电大楼", "光电"},
	{"综合教学楼", "综合"},
	{"综合楼", "综合"},
	{"图文信息中心", "图文"},
	{"公共实验中心", "公实"},
	{"卓越楼", "卓越"},
	{"格致堂", "格致"},
	{"南校区", "南区"},
	{"军工路校区", ""},
}

var (
	roomSpacingRe = regexp.MustCompile(`^([\p{Han}]+)([A-Za-z]?\d+[A-Za-z0-9-]*)$`)
	weekTokenRe   = regexp.MustCompile(`(\d+)(?:\s*[-~至]\s*(\d+))?`)
)

// ShortenUSSTLocation converts verbose USST building names into concise campus shorthand
// (e.g., "第一教学楼204" -> "一教 204").
func ShortenUSSTLocation(raw string) string {
	s := strings.TrimSpace(raw)
	if s == "" {
		return ""
	}
	for _, r := range usstBuildingReplacements {
		s = strings.ReplaceAll(s, r.full, r.short)
	}
	s = strings.Join(strings.Fields(s), " ")
	if !strings.Contains(s, " ") {
		if m := roomSpacingRe.FindStringSubmatch(s); len(m) == 3 {
			s = m[1] + " " + m[2]
		}
	}
	return strings.TrimSpace(s)
}

// ExpandWeeks parses Chinese university week expressions such as "1-16周", "1-15周(单)",
// "2-16周(双)", or "1,3,5-9周" into a sorted slice of week numbers and inferred weekType.
func ExpandWeeks(expr string) ([]int, string) {
	trimmed := strings.TrimSpace(expr)
	if trimmed == "" {
		return defaultWeeks(), "all"
	}

	weekType := "all"
	if strings.Contains(trimmed, "单") {
		weekType = "odd"
	} else if strings.Contains(trimmed, "双") {
		weekType = "even"
	}

	seen := make(map[int]struct{})
	matches := weekTokenRe.FindAllStringSubmatch(trimmed, -1)
	for _, m := range matches {
		start, err := strconv.Atoi(m[1])
		if err != nil || start < 1 || start > 25 {
			continue
		}
		end := start
		if m[2] != "" {
			if e, err := strconv.Atoi(m[2]); err == nil && e >= start && e <= 25 {
				end = e
			}
		}
		for w := start; w <= end; w++ {
			if weekType == "odd" && w%2 == 0 {
				continue
			}
			if weekType == "even" && w%2 != 0 {
				continue
			}
			seen[w] = struct{}{}
		}
	}

	if len(seen) == 0 {
		return defaultWeeks(), weekType
	}

	weeks := make([]int, 0, len(seen))
	for w := range seen {
		weeks = append(weeks, w)
	}
	sort.Ints(weeks)
	return weeks, weekType
}

// InferWeekType inspects a sorted week list and returns "odd", "even", or "all".
func InferWeekType(weeks []int) string {
	if len(weeks) < 2 {
		return "all"
	}
	allOdd := true
	allEven := true
	for _, w := range weeks {
		if w%2 == 0 {
			allOdd = false
		} else {
			allEven = false
		}
	}
	if allOdd {
		return "odd"
	}
	if allEven {
		return "even"
	}
	return "all"
}

// NormalizeCourses cleans, validates, and enriches parsed course entries.
func NormalizeCourses(input []Course) []Course {
	out := make([]Course, 0, len(input))
	colorMap := make(map[string]int)

	for i, c := range input {
		c.Name = strings.TrimSpace(c.Name)
		if c.Name == "" {
			continue
		}
		c.Teacher = strings.TrimSpace(c.Teacher)
		c.Notes = strings.TrimSpace(c.Notes)

		if c.RawLocation == "" {
			c.RawLocation = strings.TrimSpace(c.Location)
		}
		c.Location = ShortenUSSTLocation(c.Location)
		if c.Location == "" && c.RawLocation != "" {
			c.Location = ShortenUSSTLocation(c.RawLocation)
		}

		if c.DayOfWeek < 1 || c.DayOfWeek > 7 {
			continue
		}
		if c.StartPeriod < 1 {
			c.StartPeriod = 1
		}
		if c.StartPeriod > 12 {
			c.StartPeriod = 12
		}
		if c.EndPeriod < c.StartPeriod {
			c.EndPeriod = c.StartPeriod
		}
		if c.EndPeriod > 12 {
			c.EndPeriod = 12
		}

		if len(c.Weeks) == 0 {
			weeks, wt := ExpandWeeks(c.WeeksText)
			c.Weeks = weeks
			if c.WeekType == "" {
				c.WeekType = wt
			}
		} else {
			c.Weeks = dedupeSortWeeks(c.Weeks)
			if c.WeekType != "odd" && c.WeekType != "even" && c.WeekType != "all" {
				c.WeekType = InferWeekType(c.Weeks)
			}
		}

		if c.WeekType != "odd" && c.WeekType != "even" {
			c.WeekType = "all"
		}

		if idx, ok := colorMap[c.Name]; ok {
			c.ColorIndex = idx
		} else {
			idx = stableColorIndex(c.Name)
			colorMap[c.Name] = idx
			c.ColorIndex = idx
		}

		if c.ID == "" {
			c.ID = fmt.Sprintf("course-%d-%d-%d-%d", c.DayOfWeek, c.StartPeriod, c.EndPeriod, i+1)
		}

		out = append(out, c)
	}

	sort.Slice(out, func(i, j int) bool {
		if out[i].DayOfWeek != out[j].DayOfWeek {
			return out[i].DayOfWeek < out[j].DayOfWeek
		}
		if out[i].StartPeriod != out[j].StartPeriod {
			return out[i].StartPeriod < out[j].StartPeriod
		}
		return out[i].Name < out[j].Name
	})

	return out
}

func defaultWeeks() []int {
	w := make([]int, 16)
	for i := range w {
		w[i] = i + 1
	}
	return w
}

func dedupeSortWeeks(weeks []int) []int {
	seen := make(map[int]struct{}, len(weeks))
	for _, w := range weeks {
		if w >= 1 && w <= 25 {
			seen[w] = struct{}{}
		}
	}
	if len(seen) == 0 {
		return defaultWeeks()
	}
	res := make([]int, 0, len(seen))
	for w := range seen {
		res = append(res, w)
	}
	sort.Ints(res)
	return res
}

func stableColorIndex(name string) int {
	h := fnv.New32a()
	_, _ = h.Write([]byte(name))
	return int(h.Sum32() % 5)
}

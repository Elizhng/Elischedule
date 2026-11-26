package schedule

import (
	"reflect"
	"testing"
)

func TestShortenUSSTLocation(t *testing.T) {
	cases := []struct {
		in   string
		want string
	}{
		{"第一教学楼204", "一教 204"},
		{"第二教学楼 310", "二教 310"},
		{"光电信息大楼502", "光电 502"},
		{"综合楼A201", "综合 A201"},
		{"公共实验中心108", "公实 108"},
		{"军工路校区 第一教学楼105", "一教 105"},
	}

	for _, tc := range cases {
		if got := ShortenUSSTLocation(tc.in); got != tc.want {
			t.Errorf("ShortenUSSTLocation(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

func TestExpandWeeks(t *testing.T) {
	weeks, wt := ExpandWeeks("1-7周(单)")
	wantWeeks := []int{1, 3, 5, 7}
	if wt != "odd" || !reflect.DeepEqual(weeks, wantWeeks) {
		t.Fatalf("ExpandWeeks odd = (%v, %q), want (%v, odd)", weeks, wt, wantWeeks)
	}

	weeks2, wt2 := ExpandWeeks("2-8周(双)")
	wantWeeks2 := []int{2, 4, 6, 8}
	if wt2 != "even" || !reflect.DeepEqual(weeks2, wantWeeks2) {
		t.Fatalf("ExpandWeeks even = (%v, %q), want (%v, even)", weeks2, wt2, wantWeeks2)
	}

	weeks3, wt3 := ExpandWeeks("1,3,5-7周")
	wantWeeks3 := []int{1, 3, 5, 6, 7}
	if wt3 != "all" || !reflect.DeepEqual(weeks3, wantWeeks3) {
		t.Fatalf("ExpandWeeks mixed = (%v, %q), want (%v, all)", weeks3, wt3, wantWeeks3)
	}
}

func TestNormalizeCourses(t *testing.T) {
	raw := []Course{
		{
			Name:        "高等数学A(上)",
			Teacher:     "张明远",
			Location:    "第一教学楼204",
			DayOfWeek:   1,
			StartPeriod: 1,
			EndPeriod:   2,
			WeeksText:   "1-16周",
		},
		{
			Name:        "高等数学A(上)",
			Teacher:     "张明远",
			Location:    "第一教学楼204",
			DayOfWeek:   3,
			StartPeriod: 3,
			EndPeriod:   4,
			Weeks:       []int{1, 3, 5, 7},
		},
	}

	got := NormalizeCourses(raw)
	if len(got) != 2 {
		t.Fatalf("expected 2 courses, got %d", len(got))
	}
	if got[0].Location != "一教 204" {
		t.Errorf("expected shortened location 一教 204, got %q", got[0].Location)
	}
	if got[0].ColorIndex != got[1].ColorIndex {
		t.Errorf("same course should share color index, got %d vs %d", got[0].ColorIndex, got[1].ColorIndex)
	}
	if got[1].WeekType != "odd" {
		t.Errorf("expected inferred weekType odd, got %q", got[1].WeekType)
	}
}

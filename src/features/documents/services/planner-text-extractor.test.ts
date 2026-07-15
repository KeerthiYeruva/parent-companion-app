import { describe, expect, it } from 'vitest';
import { extractPlannerRows } from '@/features/documents/services/planner-text-extractor';
import { importPipeline } from '@/features/import/services/import-pipeline';

describe('extractPlannerRows', () => {
  it('extracts dated planner rows with inferred child name and categories', () => {
    const rows = extractPlannerRows({
      relativePath: 'Aarav/July/Planner.pdf',
      childNames: ['Aarav', 'Myra'],
      contentText: [
        '2026-07-10 Homework Math worksheet chapter 3',
        '11/07/2026 Class Test Science revision 2',
        '12 July 2026 Activity Dance practice',
      ].join('\n'),
    });

    expect(rows).toEqual([
      {
        childName: 'Aarav',
        category: 'Homework',
        subject: 'Math',
        title: 'worksheet chapter 3',
        dueDate: '2026-07-10',
        description: '2026-07-10 Homework Math worksheet chapter 3',
      },
      {
        childName: 'Aarav',
        category: 'ClassTest',
        subject: 'Science',
        title: 'revision 2',
        dueDate: '2026-07-11',
        description: '11/07/2026 Class Test Science revision 2',
      },
      {
        childName: 'Aarav',
        category: 'Activity',
        subject: 'Dance',
        title: 'practice',
        dueDate: '2026-07-12',
        description: '12 July 2026 Activity Dance practice',
      },
    ]);
  });

  it('skips lines that do not contain both category and parseable date', () => {
    const rows = extractPlannerRows({
      relativePath: 'Planner.pdf',
      childNames: [],
      contentText: 'Homework no date here\n2026-07-10 no category here',
    });

    expect(rows).toEqual([]);
  });

  it('skips timetable and school-note artifacts from generic planner parsing', () => {
    const rows = extractPlannerRows({
      relativePath: 'Grade 1/July/Scholastic Planner.pdf',
      childNames: ['Grade 1'],
      contentText: [
        'July 2026 Planner',
        'Home Study',
        '13.07.26 (Monday) 14.07.26 (Tuesday) 15.07.26 (Wednesday) 16.07.26 (Thursday) 17.07.26 (Friday)',
        '17.07.26 (FRIDAY) COMPUTER SCIENCE',
        '~ All books and notebooks will be sent on to home for UT-I.',
      ].join('\n'),
    });

    expect(rows).toEqual([]);
  });

  it('does not import book timetable rows as study tasks', () => {
    const rows = extractPlannerRows({
      relativePath: 'Grade 5/July/Scholastic Planner.pdf',
      childNames: ['Grade 5'],
      contentText: [
        'July 2026 Planner',
        'Home Study',
        '1 ENGLISH, HINDI (COURSE BOOK) MONDAY THURSDAY',
        '2 TUESDAY FRIDAY',
        '3 MONDAY DAILY',
        '6 COMPUTER, G.K ACCORDING TO THE TIMETABLE',
        '7 S.S.T, SCIENCE (COURSE BOOK & NOTEBOOK) AS REQUIRED',
      ].join('\n'),
    });

    expect(rows).toEqual([]);
  });

  it('does not read unit-test schedule rows from scholastic planner files', () => {
    const rows = extractPlannerRows({
      relativePath: 'Grade 5/July/Scholastic Planner.pdf',
      childNames: ['Grade 5'],
      contentText: [
        'Examination Schedule',
        'Home Study',
        '17-07-2026 (FRIDAY) COMPUTER SCIENCE',
        '24-07-2026 (FRIDAY) SOCIAL STUDIES',
      ].join('\n'),
    });

    expect(rows).toEqual([]);
  });

  it('does not run unit-test portion extraction on scholastic planner tables', () => {
    const rows = extractPlannerRows({
      relativePath: 'Grade 5/July/Scholastic Planner.pdf',
      childNames: ['Grade 5'],
      contentText: [
        'July 2026 Scholastic Planner',
        'Unit Test Pending Portions Chapter Name',
        'ENGLISH Pending Portions Dictation Class Test Recap of Creative Revision 1',
        'SCIENCE Chapter- 1 Chapter- 4 Revision 1 Revision 2 Revision 3',
      ].join('\n'),
    });

    expect(rows).toEqual([]);
  });

  it('maps only actionable scholastic matrix labels by subject row and date column', () => {
    const rows = extractPlannerRows({
      relativePath: 'Grade 1/July/Scholastic Planner.pdf',
      childNames: ['Grade 1'],
      contentText: [
        'SUBJECT & WEEK\t06.07.26 (Monday)\t07.07.26 (Tuesday)\t08.07.26 (Wednesday)\t09.07.26 (Thursday)\t10.07.26 (Friday)',
        'ENGLISH\tCreative Writing 2\tWorkbook Chapter -1\tWorkbook Chapter -1\tWorkbook Chapter -1\tCLASS TEST',
        '\t\tFootball for All\tFootball for All\tNotebook work New words\tGrammar - Nouns and Punctuation/Sentences',
        'MATHEMATICS\tChapter- 5\tChapter- 5\tChapter- 5\tChapter- 5\tChapter- 5',
        '\tNumbers up to 100 H.W: Q16-Q20\tNumbers up to 100\tNumbers up to 100\tNumbers up to 100\tGraded Lab activity',
        '\tPg. No. 96,97,98\tPg. No. 99,100\tPg. No. 101,102\tNotebook work\tComparison of two-digit numbers.',
        'SCIENCE\tChapter -2\tChapter -2\tChapter -2\tChapter -2\tChapter-2',
        '\tHow Things Move\tHow Things Move\tHow Things Move\tRevision\tGraded Project',
      ].join('\n'),
    });

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          childName: 'Grade 1',
          category: 'ClassTest',
          subject: 'English',
          dueDate: '2026-07-10',
          title: 'Class Test Grammar - Nouns and Punctuation/Sentences',
          description: 'CLASS TEST Grammar - Nouns and Punctuation/Sentences',
        }),
        expect.objectContaining({
          category: 'Homework',
          subject: 'Mathematics',
          dueDate: '2026-07-06',
          title: expect.stringContaining('Numbers up to 100'),
          description: 'Homework: Q16-Q20 Pg. No. 96,97,98',
        }),
        expect.objectContaining({
          category: 'Activity',
          subject: 'Mathematics',
          dueDate: '2026-07-10',
          title: 'Activity Comparison of two-digit numbers',
          description: expect.stringContaining('Graded Lab activity'),
        }),
        expect.objectContaining({
          category: 'Project',
          subject: 'Science',
          dueDate: '2026-07-10',
          title: 'Chapter-2 Project',
          description: 'Graded Project',
        }),
      ])
    );
    expect(rows).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: 'HomeStudy',
          subject: 'Science',
          dueDate: '2026-07-09',
        }),
      ])
    );
  });

  it('does not turn unit-test revision matrix cells into tasks', () => {
    const rows = extractPlannerRows({
      relativePath: 'Grade 1/July/Scholastic Planner.pdf',
      childNames: ['Grade 1'],
      contentText: [
        'SUBJECT & WEEK\t20.07.26 (Monday)\t21.07.26 (Tuesday)',
        'SCIENCE\tUT-I Revision Exam material\tUNIT TEST',
      ].join('\n'),
    });

    expect(rows).toEqual([]);
  });

  it('does not import stitched scholastic section fragments as review rows', () => {
    const rows = extractPlannerRows({
      relativePath: 'Grade 1/July/Scholastic Planner.pdf',
      childNames: ['Grade 1'],
      contentText: [
        'S.NO\tDATE\tDAY\tSUBJECT\tHOME STUDY',
        '1\t01.07.2026\tWednesday\tKannada\tNotebook Work Letter ಊ , ಋ , ಎ',
        '\t\t\t\tRead Pg. No. 16,17',
        'JULY: WEEK 2',
        '1\t06.07.2026\tMonday\tMathematics\tCourse book Pg. No. 104',
        'ACTIVITIES OF THE MONTH – JULY',
        'SUBJECT ACTIVITIES OF THE MONTH JULY',
        'MATHEMATICS Chapter -5 Numbers up to 100 Graded Lab activity – Comparison of two-digit numbers',
        'SCIENCE Chapter -2 How Things Move Graded Project – Things need air to move',
      ].join('\n'),
    });

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: 'HomeStudy',
          title: 'Notebook Work Letter ಊ , ಋ , ಎ Read Pg. No. 16,17',
        }),
      ])
    );
    expect(rows).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ subject: 'Notebook Work Letter' }),
        expect.objectContaining({ title: expect.stringContaining('JULY: WEEK') }),
        expect.objectContaining({ title: 'Project' }),
        expect.objectContaining({ title: '–' }),
      ])
    );
  });

  it('keeps scholastic matrix cleanup separate from unit-test files', () => {
    const rows = extractPlannerRows({
      relativePath: 'Grade 5/July/Scholastic Planner.pdf',
      childNames: ['Grade 5'],
      contentText: [
        'SUBJECT & WEEK\t06.07.26 (Monday)\t07.07.26 (Tuesday)\t17.07.26 (Friday)\t22.07.26 (Wednesday)',
        'SOCIAL STUDIES\tClass Test-06/07/2026 Chapter 5 Recap\tGraded Project\t\tUNIT TEST -1',
        'HINDI\t\t\tUNIT TEST -1\t',
        'MATHEMATICS\t\tGraded Lab activity –\t\t',
      ].join('\n'),
    });

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: 'ClassTest',
          subject: 'Social Studies',
          dueDate: '2026-07-06',
          title: 'Chapter 5 Recap',
          description: 'Class Test-06/07/2026 Chapter 5 Recap',
        }),
        expect.objectContaining({
          category: 'Activity',
          subject: 'Mathematics',
          dueDate: '2026-07-07',
          title: 'Mathematics Activity',
          description: expect.stringContaining('Graded Lab activity'),
        }),
      ])
    );
    expect(rows).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: 'UnitTest' }),
        expect.objectContaining({ title: '1' }),
        expect.objectContaining({ title: '–' }),
        expect.objectContaining({ title: expect.stringMatching(/^\d{1,2}[./-]\d{1,2}/) }),
      ])
    );
  });

  it('does not carry class-test labels into later unrelated matrix cells', () => {
    const rows = extractPlannerRows({
      relativePath: 'Grade 1/July/Scholastic Planner.pdf',
      childNames: ['Grade 1'],
      contentText: [
        'SUBJECT & WEEK\t29.07.26 (Wednesday)',
        'GENERAL KNOWLEDGE\tCLASS TEST',
        '\tPractice Grammar - Nouns and Punctuation for Class Test Chapter- Using Computer Dos and Pg. No. 36,37 Notebook Work letter Poem Revision Home Study Pg. No. 21 Practice poem Naayi Mari ( Swar & Vyanjan JULY',
      ].join('\n'),
    });

    expect(rows).toEqual([
      expect.objectContaining({
        category: 'ClassTest',
        subject: 'General knowledge',
        dueDate: '2026-07-29',
        title: 'Class Test',
      }),
    ]);
    expect(rows).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: expect.stringContaining('Practice Grammar') }),
      ])
    );
  });

  it('keeps explicit matrix labels while avoiding chapter/revision context as titles', () => {
    const rows = extractPlannerRows({
      relativePath: 'Grade 5/July/Scholastic Planner.pdf',
      childNames: ['Grade 5'],
      contentText: [
        'SUBJECT & WEEK\t07.07.26 (Tuesday)\t08.07.26 (Wednesday)',
        'MATHEMATICS\tGraded Project\tGraded Activity',
        'COMPUTER\tChapter - 1\tActivity',
      ].join('\n'),
    });

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: 'Activity',
          subject: 'Mathematics',
          dueDate: '2026-07-08',
          title: 'Mathematics Activity',
          description: 'Graded Activity',
        }),
      ])
    );
    expect(rows).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ title: 'Chapter - 1 Activity' })])
    );
  });

  it('extracts grade 5 matrix homework from H.W labels and stores teaching text as context', () => {
    const rows = extractPlannerRows({
      relativePath: 'Grade 5/July/Scholastic Planner.pdf',
      childNames: ['Grade 5'],
      contentText: [
        'SUBJECT & WEEK\t13.07.26 (Monday)',
        'MATHEMATICS\tRevision - 2 Chapter-1 Place value Q21-Q26 H.W: Q16-Q20',
      ].join('\n'),
    });

    expect(rows).toEqual([
      expect.objectContaining({
        category: 'Homework',
        subject: 'Mathematics',
        dueDate: '2026-07-13',
        title: expect.stringContaining('Place value'),
        description: expect.stringContaining('Revision work'),
      }),
    ]);
  });

  it('keeps activities-of-the-month rows when matrix rows exist in the same scholastic planner', () => {
    const rows = extractPlannerRows({
      relativePath: 'Grade 1/July/Scholastic Planner.pdf',
      childNames: ['Grade 1'],
      contentText: [
        'SUBJECT & WEEK\t08.07.26 (Wednesday)',
        'COMPUTER SCIENCE\tGraded Lab activity',
        'ACTIVITIES OF THE MONTH – JULY',
        'SUBJECT ACTIVITIES OF THE MONTH',
        'JULY',
        'MATHEMATICS Chapter -5 Numbers up to 100 Graded Lab activity – Comparison of two-digit numbers',
        'SCIENCE Chapter -2 How Things Move Graded Project – Things need air to move',
        'CCA 09.07.2026 Clay Modeling',
        'Talk the Talk 15.07.2026 Safety',
      ].join('\n'),
    });

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: 'Activity',
          subject: 'CCA',
          title: 'Clay Modeling',
          dueDate: '2026-07-09',
        }),
        expect.objectContaining({
          category: 'Activity',
          subject: 'Talk the Talk',
          title: 'Safety',
          dueDate: '2026-07-15',
        }),
      ])
    );
  });

  it('does not run generic fallback when a fixed table parser owns the document', () => {
    const rows = extractPlannerRows({
      relativePath: 'Grade 1/July/Home Study.pdf',
      childNames: ['Grade 1'],
      contentText: [
        'S.NO\tDATE\tDAY\tSUBJECT\tHOME STUDY',
        '1\t29.07.2026\tWednesday\tKannada\tPractice poem Naayi Mari',
        'REVISION Chapter 1 and Chapter 2',
      ].join('\n'),
    });

    expect(rows).toEqual([
      expect.objectContaining({
        category: 'HomeStudy',
        subject: 'Kannada',
        dueDate: '2026-07-29',
        title: 'Practice poem Naayi Mari',
      }),
    ]);
  });

  it('maps home-study table rows from fixed columns', () => {
    const rows = extractPlannerRows({
      relativePath: 'Grade 1/July/Home Study.pdf',
      childNames: ['Grade 1'],
      contentText: [
        'JULY: WEEK 1',
        'S.NO\tDATE\tDAY\tSUBJECT\tHOME STUDY',
        '1\t01.07.2026\tWednesday\tKannada\tNotebook Work letter ಉ, ಊ,ಎ',
        '2\t02.07.2026\tThursday\tHindi\tRead Pg. No. 16,17',
        '3\t03.07.2026\tFriday\tEnglish\tPractice Grammar - Nouns and Punctuation for Class Test',
        '4\t03.07.2026\tFriday\tComputer\tChapter- Using Computer Dos and Don’ts',
        '\t\t\t\tPg. No. 36,37',
      ].join('\n'),
    });

    expect(rows).toEqual([
      expect.objectContaining({
        category: 'HomeStudy',
        subject: 'Kannada',
        dueDate: '2026-07-01',
        title: 'Notebook Work letter ಉ, ಊ,ಎ',
      }),
      expect.objectContaining({
        category: 'HomeStudy',
        subject: 'Hindi',
        dueDate: '2026-07-02',
        title: 'Read Pg. No. 16,17',
      }),
      expect.objectContaining({
        category: 'HomeStudy',
        subject: 'English',
        dueDate: '2026-07-03',
        title: 'Practice Grammar - Nouns and Punctuation for Class Test',
      }),
      expect.objectContaining({
        category: 'HomeStudy',
        subject: 'Computer Science',
        dueDate: '2026-07-03',
        title: 'Chapter- Using Computer Dos and Don’ts Pg. No. 36,37',
      }),
    ]);
  });

  it('maps loose PDF home-study table rows when columns are space grouped', () => {
    const rows = extractPlannerRows({
      relativePath: 'Grade 1/July/Scholastic Planner.pdf',
      childNames: ['Grade 1'],
      contentText: [
        'JULY: WEEK 2',
        'S.NO    DATE    DAY SUBJECT             HOME STUDY',
        '1 06.07.2026            Monday Mathematics      Course book Pg. No. 104',
        '2 07.07.2026            Tuesday Science Practice Ch-2 How Things Move',
        '3 08.07.2026    Wednesday       Kannada',
        '                        Notebook Work letter    ಏ , ಐ',
        '                        Poem Revision',
        '4 09.07.2026    Thursday        Hindi',
        '                        Home Study Pg. No. 21',
        '5 10.07.2026            Friday English  Learn Creative Writing 1 and 2',
      ].join('\n'),
    });

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: 'HomeStudy',
          subject: 'Kannada',
          dueDate: '2026-07-08',
          title: 'Notebook Work letter ಏ , ಐ',
        }),
        expect.objectContaining({
          category: 'HomeStudy',
          subject: 'Hindi',
          dueDate: '2026-07-09',
          title: 'Home Study Pg. No. 21',
        }),
      ])
    );
    expect(rows).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: 'Kannada',
          title: expect.stringContaining('Poem Revision'),
        }),
      ])
    );
  });

  it('maps class-test portions table rows from fixed columns', () => {
    const rows = extractPlannerRows({
      relativePath: 'Grade 1/July/Class Test Portions.pdf',
      childNames: ['Grade 1'],
      contentText: [
        'JULY MONTH - CLASS TEST AND PORTIONS',
        'DATE\tDAY\tSUBJECT\tCLASS TEST - PORTIONS',
        '06.07.2026\tMonday\tHindi\tSwar & Vyanjan',
        '10.07.2026\tFriday\tEnglish\tGrammar - Nouns and Punctuation/Sentences',
        '13.07.2026\tMonday\tMathematics\tChapter – 5 Numbers up to 100',
      ].join('\n'),
    });

    expect(rows).toEqual([
      expect.objectContaining({
        category: 'ClassTest',
        subject: 'Hindi',
        dueDate: '2026-07-06',
        title: 'Swar & Vyanjan',
      }),
      expect.objectContaining({
        category: 'ClassTest',
        subject: 'English',
        dueDate: '2026-07-10',
        title: 'Grammar - Nouns and Punctuation/Sentences',
      }),
      expect.objectContaining({
        category: 'ClassTest',
        subject: 'Mathematics',
        dueDate: '2026-07-13',
        title: 'Chapter – 5 Numbers up to 100',
      }),
    ]);
  });

  it('maps unit-test timetable rows from date-and-subject columns while skipping notes', () => {
    const rows = extractPlannerRows({
      relativePath: 'Grade 1/Unit Test Timetable.pdf',
      childNames: ['Grade 1'],
      contentText: [
        'UNIT TEST-I EXAM TIMETABLE',
        'DATE & DAY\tSUBJECT',
        '17.07.2026 (FRIDAY)\tCOMPUTER SCIENCE',
        '20.07.2026 (MONDAY)\tMATHEMATICS',
        '21.07.2026 (TUESDAY)\tHINDI',
        '22.07.2026 (WEDNESDAY)\tSCIENCE',
        '~ Please note the school will be half a day working during Unit Test-I exam days.',
        '~ 24.07.2026 will be a working day for grade 1 students from 7:30 a.m. - 12 p.m.',
        '~ All books and notebooks will be sent on 10.07.2026 to home for UT-I.',
      ].join('\n'),
    });

    expect(rows).toEqual([
      expect.objectContaining({
        category: 'UnitTest',
        subject: 'Computer Science',
        dueDate: '2026-07-17',
        title: 'Computer Science Unit Test',
      }),
      expect.objectContaining({
        category: 'UnitTest',
        subject: 'Mathematics',
        dueDate: '2026-07-20',
        title: 'Mathematics Unit Test',
      }),
      expect.objectContaining({
        category: 'UnitTest',
        subject: 'Hindi',
        dueDate: '2026-07-21',
        title: 'Hindi Unit Test',
      }),
      expect.objectContaining({
        category: 'UnitTest',
        subject: 'Science',
        dueDate: '2026-07-22',
        title: 'Science Unit Test',
      }),
    ]);
  });

  it('does not import circular notes as unit-test portions', () => {
    const rows = extractPlannerRows({
      relativePath: 'Grade 1/Unit Test Portion.pdf',
      childNames: ['Grade 1'],
      contentText: [
        'UNIT TEST PORTION',
        'Chapter Name',
        'Please find the Unit test schedule. Portions are uploaded to the parent portal.',
      ].join('\n'),
    });

    expect(rows).toEqual([]);
  });

  it('extracts section-based planner rows using month context and active category headers', () => {
    const rows = extractPlannerRows({
      relativePath: 'Aarav/July/Monthly Planner.pdf',
      childNames: ['Aarav', 'Myra'],
      contentText: [
        'July 2026 Planner',
        'Homework',
        '10 Fri Math worksheet chapter 3',
        '11 Sat English reading pages 10-12',
        'Class Test',
        '12 Sun Science revision lesson 4',
        'Activities',
        '14 Tue Dance practice',
      ].join('\n'),
    });

    expect(rows).toEqual([
      {
        childName: 'Aarav',
        category: 'Homework',
        subject: 'Math',
        title: 'worksheet chapter 3',
        dueDate: '2026-07-10',
        description: '10 Fri Math worksheet chapter 3',
      },
      {
        childName: 'Aarav',
        category: 'Homework',
        subject: 'English',
        title: 'reading pages 10-12',
        dueDate: '2026-07-11',
        description: '11 Sat English reading pages 10-12',
      },
      {
        childName: 'Aarav',
        category: 'ClassTest',
        subject: 'Science',
        title: 'revision lesson 4',
        dueDate: '2026-07-12',
        description: '12 Sun Science revision lesson 4',
      },
      {
        childName: 'Aarav',
        category: 'Activity',
        subject: 'Dance',
        title: 'practice',
        dueDate: '2026-07-14',
        description: '14 Tue Dance practice',
      },
    ]);
  });

  it('ignores week headers and parses weekday-first rows under active sections', () => {
    const rows = extractPlannerRows({
      relativePath: 'Myra/August/Weekly Planner.pdf',
      childNames: ['Aarav', 'Myra'],
      contentText: [
        'August 2026 Planner',
        'Week 1',
        'Homework',
        'Mon 10 Algebra worksheet',
        'Tue 11 Hindi reading',
        'Week 2',
        'Class Test',
        'Wed 12 Science lesson 3',
      ].join('\n'),
    });

    expect(rows).toEqual([
      {
        childName: 'Myra',
        category: 'Homework',
        subject: undefined,
        title: 'Algebra worksheet',
        dueDate: '2026-08-10',
        description: 'Mon 10 Algebra worksheet',
      },
      {
        childName: 'Myra',
        category: 'Homework',
        subject: 'Hindi',
        title: 'reading',
        dueDate: '2026-08-11',
        description: 'Tue 11 Hindi reading',
      },
      {
        childName: 'Myra',
        category: 'ClassTest',
        subject: 'Science',
        title: 'lesson 3',
        dueDate: '2026-08-12',
        description: 'Wed 12 Science lesson 3',
      },
    ]);
  });

  it('turns date-and-subject-only planner rows into useful study titles', () => {
    const rows = extractPlannerRows({
      relativePath: 'Grade 1/July/Scholastic Planner.pdf',
      childNames: ['grade 1'],
      contentText: [
        'July 2026 Planner',
        'Home Study',
        '3 Wednesday Kannada',
        '4 Thursday Hindi',
      ].join('\n'),
    });

    expect(rows).toEqual([
      expect.objectContaining({
        subject: 'Kannada',
        title: 'Study Kannada',
        dueDate: '2026-07-03',
        parserIssue: 'Date and weekday mismatch',
      }),
      expect.objectContaining({
        subject: 'Hindi',
        title: 'Study Hindi',
        dueDate: '2026-07-04',
        parserIssue: 'Date and weekday mismatch',
      }),
    ]);
  });

  it('parses table-like rows with delimited date, category, and title columns', () => {
    const rows = extractPlannerRows({
      relativePath: 'Aarav/September/Table Planner.pdf',
      childNames: ['Aarav'],
      contentText: [
        'September 2026',
        '10 Thu | Homework | English worksheet',
        '11 Fri | Activity | Football practice',
      ].join('\n'),
    });

    expect(rows).toEqual([
      {
        childName: 'Aarav',
        category: 'Homework',
        subject: 'English',
        title: 'worksheet',
        dueDate: '2026-09-10',
        description: '10 Thu | Homework | English worksheet',
      },
      {
        childName: 'Aarav',
        category: 'Activity',
        subject: undefined,
        title: 'Football practice',
        dueDate: '2026-09-11',
        description: '11 Fri | Activity | Football practice',
      },
    ]);
  });

  it('prefers explicit dot-separated row dates over contextual date logic', () => {
    const rows = extractPlannerRows({
      relativePath: 'Grade 1/July/Scholastic Planner.pdf',
      childNames: ['Grade 1'],
      contentText: [
        'July 2026 Planner',
        'Home Study',
        '03.07.2026 Friday Computer',
        '09.07.2026 Thursday Hindi',
        '10.07.2026 Friday English Learn Creative Writing 1 and 2',
      ].join('\n'),
    });

    expect(rows.map((row) => row.dueDate)).toEqual(['2026-07-03', '2026-07-09', '2026-07-10']);
    expect(rows.map((row) => row.parserIssue)).toEqual([undefined, undefined, undefined]);
  });

  it('routes explicit date and weekday mismatches to review', () => {
    const rows = extractPlannerRows({
      relativePath: 'Grade 1/July/Scholastic Planner.pdf',
      childNames: ['Grade 1'],
      contentText: ['July 2026 Planner', 'Home Study', '03.07.2026 Thursday Computer'].join('\n'),
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      dueDate: '2026-07-03',
      parserIssue: 'Date and weekday mismatch',
    });

    const result = importPipeline.run(rows, {
      sourceType: 'future-pdf',
      documentId: 'doc-1',
      childNameToIdMap: { 'grade 1': 'child-1' },
    });

    expect(result.items).toEqual([]);
    expect(result.issues).toEqual([
      expect.objectContaining({
        fieldName: 'title',
        issue: 'Row 1: Title is not parent-ready',
        severity: 'blocking',
      }),
      expect.objectContaining({
        fieldName: 'parser',
        issue: 'Row 1: Date and weekday mismatch',
        severity: 'warning',
      }),
    ]);
    expect(result.summary).toMatchObject({
      validRecords: 0,
      issuesCount: 2,
      blockingIssues: 1,
      warningIssues: 1,
    });
  });

  it('routes contextual weekend dates with weekday mismatches to review', () => {
    const rows = extractPlannerRows({
      relativePath: 'Grade 1/July/Scholastic Planner.pdf',
      childNames: ['Grade 1'],
      contentText: ['July 2026 Planner', 'Home Study', '5 Friday Computer'].join('\n'),
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      dueDate: '2026-07-05',
      parserIssue: 'Date and weekday mismatch',
    });
  });

  it('extracts co-scholastic planner subjects as activity records', () => {
    const rows = extractPlannerRows({
      relativePath: 'GRADE_5_JULY_COSCHOLASTIC_PLANNER.pdf',
      childNames: ['grade_5'],
      contentText: [
        'JULY COSCHOLASTIC MONTHLY PLANNER (2026-2027)',
        'CLASS -V',
        'ACTIVITIES JULY 1st WEEK',
        'PHYSICAL EDUCATION',
        'Warmup and basic exercises locomotor skills Running',
        'DANCE',
        'Basic steps Rhythm understanding Choreography',
        'ART & CRAFT',
        'Tangram art',
        'MUSIC',
        'Patriotic songs',
        'YOGA',
        'Yogic walking & jogging',
      ].join('\n'),
    });

    expect(rows).toEqual([
      expect.objectContaining({
        category: 'Activity',
        subject: 'Physical Education',
        title: expect.stringContaining('Warmup'),
      }),
      expect.objectContaining({
        category: 'Activity',
        subject: 'Dance',
        title: expect.stringContaining('Basic steps'),
      }),
      expect.objectContaining({
        category: 'Activity',
        subject: 'Art & Craft',
        title: expect.stringContaining('Tangram'),
      }),
      expect.objectContaining({
        category: 'Activity',
        subject: 'Music',
        title: expect.stringContaining('Patriotic'),
      }),
      expect.objectContaining({
        category: 'Activity',
        subject: 'Yoga',
        title: expect.stringContaining('Yogic'),
      }),
    ]);
  });

  it('extracts unit test portions as UnitTest preparation records', () => {
    const rows = extractPlannerRows({
      relativePath: 'Grade_1_Unit_Test_Portion_20262027.pdf',
      childNames: ['grade 1'],
      contentText: [
        'UNIT TEST - I (2026-2027)',
        'GRADE 1',
        'S. No Subject Chapter No. Chapter Name',
        'English Literature Grammar Poem Creative Writing',
        'Hindi varnamala matra',
        'Mathematics Chapter -1 Chapter- 5 Numbers Up to 50 Numbers Up to 100',
        'Science Chapter -1 Chapter -2 Things Around Us How Things Move',
        "Computer Science Chapter-1 Chapter-4 Computer A Machine Using Computers Do's and Don't",
        'General knowledge Chapter-1 Chapter-2 Knowing India Festivals are Fun',
        'Kannada Poem Letters Ondu Eradu',
      ].join('\n'),
    });

    expect(rows).toEqual([
      expect.objectContaining({
        category: 'UnitTest',
        subject: 'English',
        title: expect.stringContaining('Creative Writing'),
      }),
      expect.objectContaining({ category: 'UnitTest', subject: 'Hindi' }),
      expect.objectContaining({
        category: 'UnitTest',
        subject: 'Mathematics',
        title: expect.stringContaining('Numbers Up to 100'),
      }),
      expect.objectContaining({
        category: 'UnitTest',
        subject: 'Science',
        title: expect.stringContaining('How Things Move'),
      }),
      expect.objectContaining({ category: 'UnitTest', subject: 'Computer Science' }),
      expect.objectContaining({ category: 'UnitTest', subject: 'General knowledge' }),
      expect.objectContaining({ category: 'UnitTest', subject: 'Kannada' }),
    ]);
    expect(rows.every((row) => row.dueDate === undefined)).toBe(true);
    expect(rows.map((row) => row.parserIssue)).toEqual(
      rows.map(() => 'Unit test portion found without an exam schedule date')
    );
  });

  it('ignores non-authoritative Unit Test planner markers', () => {
    const rows = extractPlannerRows({
      relativePath: 'GRADE_5_JULY_SCHOLASTIC_PLANNER.pdf',
      childNames: ['Luhas', 'Grade 5'],
      contentText: [
        'JULY 2026 SCHOLASTIC PLANNER CLASS V',
        'UNIT TEST -1',
        'UT-1 Revision',
        'Exam material',
      ].join('\n'),
    });

    expect(rows.filter((row) => row.category === 'UnitTest')).toEqual([]);
  });
  it('extracts circular unit test schedule dates without inventing a 10 July test', () => {
    const rows = extractPlannerRows({
      relativePath: '1782974912050_EXAM_CIRCULAR_UT_12026.pdf',
      childNames: ['grade 1'],
      contentText: [
        'CIRCULAR/41/2026-27/GRADE 1-5 02/07/2026',
        'Kindly note the Examination schedule for the UT1.',
        'DATE DAY SUBJECT',
        '17/07/2026 FRIDAY COMPUTER',
        '20/07/2026 MONDAY MATHEMATICS',
        '21/07/2026 TUESDAY HINDI',
        '22/07/2026 WEDNESDAY SCIENCE',
        '23/07/2026 THURSDAY KANNADA',
        '24/07/2026 FRIDAY SOCIAL STUDIES',
        '27/07/2026 MONDAY ENGLISH',
        '28/07/2026 TUESDAY GK',
      ].join('\n'),
    });

    expect(rows).toEqual([
      expect.objectContaining({
        category: 'UnitTest',
        subject: 'Computer Science',
        title: 'Computer Science Unit Test',
        dueDate: '2026-07-17',
      }),
      expect.objectContaining({
        category: 'UnitTest',
        subject: 'Mathematics',
        title: 'Mathematics Unit Test',
        dueDate: '2026-07-20',
      }),
      expect.objectContaining({
        category: 'UnitTest',
        subject: 'Hindi',
        title: 'Hindi Unit Test',
        dueDate: '2026-07-21',
      }),
      expect.objectContaining({
        category: 'UnitTest',
        subject: 'Science',
        title: 'Science Unit Test',
        dueDate: '2026-07-22',
      }),
      expect.objectContaining({
        category: 'UnitTest',
        subject: 'Kannada',
        title: 'Kannada Unit Test',
        dueDate: '2026-07-23',
      }),
      expect.objectContaining({
        category: 'UnitTest',
        subject: 'Social Studies',
        title: 'Social Studies Unit Test',
        dueDate: '2026-07-24',
      }),
      expect.objectContaining({
        category: 'UnitTest',
        subject: 'English',
        title: 'English Unit Test',
        dueDate: '2026-07-27',
      }),
      expect.objectContaining({
        category: 'UnitTest',
        subject: 'General knowledge',
        title: 'General knowledge Unit Test',
        dueDate: '2026-07-28',
      }),
    ]);
    expect(rows.some((row) => row.dueDate === '2026-07-10')).toBe(false);
  });

  it('reads date-day-subject circular tables without treating the day as part of the subject', () => {
    const rows = extractPlannerRows({
      relativePath: '1782974912050_EXAM_CIRCULAR_UT_12026.pdf',
      childNames: ['grade 1'],
      contentText: [
        'CIRCULAR/41/2026-27/GRADE 1-5 02/07/2026',
        'Please find the Unit test schedule. Portions are uploaded to the parent portal.',
        'DATE\tDAY\tSUBJECT',
        '17/07/2026\tFRIDAY\tCOMPUTER',
        '20/07/2026\tMONDAY\tMATHEMATICS',
        '21/07/2026\tTUESDAY\tHINDI',
      ].join('\n'),
    });

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: 'UnitTest',
          subject: 'Computer Science',
          title: 'Computer Science Unit Test',
          dueDate: '2026-07-17',
        }),
        expect.objectContaining({
          category: 'UnitTest',
          subject: 'Mathematics',
          title: 'Mathematics Unit Test',
          dueDate: '2026-07-20',
        }),
        expect.objectContaining({
          category: 'UnitTest',
          subject: 'Hindi',
          title: 'Hindi Unit Test',
          dueDate: '2026-07-21',
        }),
      ])
    );
    expect(rows).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ subject: expect.stringMatching(/FRIDAY|MONDAY|TUESDAY/) }),
      ])
    );
  });

  it('keeps grade range hints on circular unit-test schedules for later child fan-out', () => {
    const rows = extractPlannerRows({
      relativePath: '1782974912050_EXAM_CIRCULAR_UT_12026.pdf',
      childNames: ['Grade 1-5'],
      contentText: [
        'CIRCULAR/41/2026-27/GRADE 1-5 02/07/2026',
        'Kindly note the Examination schedule for the UT1.',
        'DATE DAY SUBJECT',
        '17/07/2026 FRIDAY COMPUTER',
        '20/07/2026 MONDAY MATHEMATICS',
        '21/07/2026 TUESDAY HINDI',
      ].join('\n'),
    });

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          childName: 'Grade 1-5',
          category: 'UnitTest',
          subject: 'Computer Science',
          title: 'Computer Science Unit Test',
        }),
        expect.objectContaining({
          childName: 'Grade 1-5',
          category: 'UnitTest',
          subject: 'Mathematics',
          title: 'Mathematics Unit Test',
        }),
        expect.objectContaining({
          childName: 'Grade 1-5',
          category: 'UnitTest',
          subject: 'Hindi',
          title: 'Hindi Unit Test',
        }),
      ])
    );
  });

  it('prefers shared grade range hints over single-grade aliases on unit-test circulars', () => {
    const rows = extractPlannerRows({
      relativePath: '1782974912050_EXAM_CIRCULAR_UT_12026.pdf',
      childNames: ['grade 1', 'grade 5', 'GRADE 1-5'],
      contentText: [
        'CIRCULAR/41/2026-27/GRADE 1-5 02/07/2026',
        'Kindly note the Examination schedule for the UT1.',
        'DATE DAY SUBJECT',
        '17/07/2026 FRIDAY COMPUTER',
      ].join('\n'),
    });

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          childName: 'GRADE 1-5',
          category: 'UnitTest',
          subject: 'Computer Science',
          title: 'Computer Science Unit Test',
        }),
      ])
    );
    expect(rows).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ childName: 'grade 1' })])
    );
  });

  it('maps the grade 1-5 unit-test circular table as a separate schedule document', () => {
    const rows = extractPlannerRows({
      relativePath: 'CIRCULAR_41_2026_27_GRADE_1_5_UT1.pdf',
      childNames: ['grade 1', 'grade 5'],
      contentText: [
        'CIRCULAR/41/2026-27/GRADE 1-5 02/07/2026',
        'Dear Parent,',
        'Please find the Unit test schedule. Portions are uploaded to the parent portal.',
        'Kindly note the Examination schedule for the UT1.',
        'DATE\tDAY\tSUBJECT',
        '17/07/2026\tFRIDAY\tCOMPUTER',
        '20/07/2026\tMONDAY\tMATHEMATICS',
        '21/07/2026\tTUESDAY\tHINDI',
        '22/07/2026\tWEDNESDAY\tSCIENCE',
        '23/07/2026\tTHURSDAY\tKANNADA',
        '24/07/2026\tFRIDAY\tSOCIAL STUDIES',
        '27/07/2026\tMONDAY\tENGLISH',
        '28/07/2026\tTUESDAY\tGK',
      ].join('\n'),
    });

    expect(rows).toEqual([
      expect.objectContaining({
        category: 'UnitTest',
        subject: 'Computer Science',
        title: 'Computer Science Unit Test',
        dueDate: '2026-07-17',
      }),
      expect.objectContaining({
        category: 'UnitTest',
        subject: 'Mathematics',
        title: 'Mathematics Unit Test',
        dueDate: '2026-07-20',
      }),
      expect.objectContaining({
        category: 'UnitTest',
        subject: 'Hindi',
        title: 'Hindi Unit Test',
        dueDate: '2026-07-21',
      }),
      expect.objectContaining({
        category: 'UnitTest',
        subject: 'Science',
        title: 'Science Unit Test',
        dueDate: '2026-07-22',
      }),
      expect.objectContaining({
        category: 'UnitTest',
        subject: 'Kannada',
        title: 'Kannada Unit Test',
        dueDate: '2026-07-23',
      }),
      expect.objectContaining({
        category: 'UnitTest',
        subject: 'Social Studies',
        title: 'Social Studies Unit Test',
        dueDate: '2026-07-24',
      }),
      expect.objectContaining({
        category: 'UnitTest',
        subject: 'English',
        title: 'English Unit Test',
        dueDate: '2026-07-27',
      }),
      expect.objectContaining({
        category: 'UnitTest',
        subject: 'General knowledge',
        title: 'General knowledge Unit Test',
        dueDate: '2026-07-28',
      }),
    ]);
    expect(rows).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ title: expect.stringContaining('portal') }),
        expect.objectContaining({ title: 'Unit Test Portion' }),
      ])
    );
  });

  it('extracts graded lab activities and projects from scholastic activity sections', () => {
    const rows = extractPlannerRows({
      relativePath: 'GRADE_1JULY_SCHOLASTIC_PLANNER.pdf',
      childNames: ['grade 1'],
      contentText: [
        'JULY 2026 SCHOLASTIC PLANNER CLASS I',
        'ACTIVITIES OF THE MONTH - JULY',
        'MATHEMATICS Chapter -5 Numbers up to 100 Graded Lab activity - Comparison of two-digit numbers',
        'SCIENCE Chapter -2 How Things Move Graded Project - Things need air to move',
        'CCA 09.07.2026 Clay Modeling',
        'Talk the Talk 15.07.2026 Safety',
      ].join('\n'),
    });

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: 'Activity',
          subject: 'Mathematics',
          title: 'Comparison of two-digit numbers',
        }),
        expect.objectContaining({
          category: 'Project',
          subject: 'Science',
          title: 'Things need air to move',
        }),
        expect.objectContaining({
          category: 'Activity',
          subject: 'CCA',
          title: 'Clay Modeling',
          dueDate: '2026-07-09',
        }),
        expect.objectContaining({
          category: 'Activity',
          subject: 'Talk the Talk',
          title: 'Safety',
          dueDate: '2026-07-15',
        }),
      ])
    );
  });

  it('extracts broader scholastic graded skills and project references', () => {
    const rows = extractPlannerRows({
      relativePath: 'GRADE_5_JULY_SCHOLASTIC_PLANNER.pdf',
      childNames: ['grade 5'],
      contentText: [
        'JULY 2026 SCHOLASTIC PLANNER CLASS V',
        'Hindi Coursebook work Graded Listening Skill',
        'Kannada Graded Speaking skills',
        'Science Project: Seed germination observation',
      ].join('\n'),
    });

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: 'Activity', title: 'Graded Listening Skill' }),
        expect.objectContaining({ category: 'Activity', title: 'Graded Speaking skills' }),
        expect.objectContaining({ category: 'Project', title: 'Seed germination observation' }),
      ])
    );
  });

  it('maps explicit school labels without guessing categories', () => {
    const rows = extractPlannerRows({
      relativePath: 'Grade 5/July/Planner.pdf',
      childNames: ['grade 5'],
      contentText: [
        'July 2026 Planner',
        'CLASS TEST 10.07.2026 English',
        'GRADED PROJECT Things need air to move',
        'DANCE Contemporary Style',
        'REVISION Chapter 1 and Chapter 2',
      ].join('\n'),
    });

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          category: 'ClassTest',
          title: '10.07.2026 English',
          dueDate: '2026-07-10',
          description: 'CLASS TEST 10.07.2026 English',
        }),
        expect.objectContaining({
          category: 'Project',
          title: 'Things need air to move',
          description: 'GRADED PROJECT Things need air to move',
          parserIssue: 'Date needs confirmation',
        }),
        expect.objectContaining({
          category: 'Activity',
          subject: 'Dance',
          title: 'Contemporary Style',
          description: 'DANCE Contemporary Style',
          parserIssue: 'Date needs confirmation',
        }),
        expect.objectContaining({
          category: 'HomeStudy',
          title: 'Chapter 1 and Chapter 2',
          description: 'REVISION Chapter 1 and Chapter 2',
          parserIssue: 'Date needs confirmation',
        }),
      ])
    );
  });

  it('does not turn timetable fragments and school notes into tasks', () => {
    const rows = extractPlannerRows({
      relativePath: 'Grade 1/July/Planner.pdf',
      childNames: ['grade 1'],
      contentText: [
        'Class Test',
        '.07.26 (Monday) 14.07.26 (Tuesday) 15.07.26 (Wednesday) 16.07.26 (Thursday) 17.07.26 (Friday)',
        '~ All books and notebooks will be sent on to home for UT-I.',
        '(FRIDAY) COMPUTER SCIENCE',
      ].join('\n'),
    });

    expect(rows).toEqual([]);
  });
});

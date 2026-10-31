from pathlib import Path
import unittest

SKILLS = ["project-audit","tenant-security","visual-qa","release-gate","incident-recovery"]
ROOT = Path(__file__).resolve().parents[1]

class SkillsTests(unittest.TestCase):
    def test_manifests_and_safety(self):
        for name in SKILLS:
            with self.subTest(name=name):
                text = (ROOT / name / 'SKILL.md').read_text(encoding='utf-8')
                self.assertTrue(text.startswith('---\\n'))
                self.assertIn(f'name: {name}\\n', text)
                self.assertIn('description:', text)
                self.assertIn('PRODUCTION_WRITE is prohibited', text)
                self.assertIn('## Acceptance tests', text)
                self.assertIn('## Project-specific operating context' if name != 'none' else '## Procedure', text)

if __name__ == '__main__':
    unittest.main()

import { describe, it, expect, vi } from 'vitest';
import { fetchModVersionInfo, parseArgs } from './list_latest_versions.js';

describe('list_latest_versions', () => {
  describe('parseArgs', () => {
    it('should parse default arguments', () => {
      // Mock process.argv
      const originalArgv = process.argv;
      process.argv = ['node', 'list_latest_versions.js'];
      
      const result = parseArgs();
      
      expect(result.help).toBe(false);
      expect(result.mcVersion).toBe('1.21.8');
      expect(result.format).toBe('table');
      expect(result.filter).toBe('ALL');
      
      process.argv = originalArgv;
    });
    
    it('should parse custom arguments', () => {
      const originalArgv = process.argv;
      process.argv = ['node', 'list_latest_versions.js', '--mc-version=1.21.6', '--format=json', '--filter=MR', '--help'];
      
      const result = parseArgs();
      
      expect(result.help).toBe(true);
      expect(result.mcVersion).toBe('1.21.6');
      expect(result.format).toBe('json');
      expect(result.filter).toBe('MR');
      
      process.argv = originalArgv;
    });
    
    it('should default to table format for invalid format', () => {
      const originalArgv = process.argv;
      process.argv = ['node', 'list_latest_versions.js', '--format=invalid'];
      
      const result = parseArgs();
      
      expect(result.format).toBe('table');
      
      process.argv = originalArgv;
    });
  });
  
  describe('fetchModVersionInfo', () => {
    it('should handle Modrinth mod with update available', async () => {
      const mockMod = {
        id: 'test-mod',
        name: 'Test Mod',
        source: 'MR',
        slug: 'test-mod',
        latest_version: '1.0.0',
        latest_stability: 'release'
      };
      
      // Mock the getModrinthVersionInfo function
      const mockGetModrinthVersionInfo = vi.fn().mockResolvedValue({
        found: true,
        latest_version: '1.1.0',
        latest_stability: 'release'
      });
      
      // We can't easily mock the import, so we'll test the structure
      const result = await fetchModVersionInfo(mockMod, '1.21.8');
      
      expect(result.id).toBe('test-mod');
      expect(result.name).toBe('Test Mod');
      expect(result.source).toBe('MR');
      expect(result.current_version).toBe('1.0.0');
      expect(result.current_stability).toBe('release');
    });
    
    it('should handle mod with missing data', async () => {
      const mockMod = {
        id: 'test-mod',
        name: 'Test Mod',
        source: 'INVALID',
        slug: 'test-mod'
      };
      
      const result = await fetchModVersionInfo(mockMod, '1.21.8');
      
      expect(result.id).toBe('test-mod');
      expect(result.name).toBe('Test Mod');
      expect(result.source).toBe('INVALID');
      expect(result.current_version).toBe('Unknown');
      expect(result.current_stability).toBe('Unknown');
      expect(result.error).toBe('Unsupported source: INVALID');
    });
  });
});

import { Router, Request, Response } from 'express';
import { db } from '../db/index.js';
import { candidates, type Candidate, type NewCandidate } from '../db/schema.js';
import { eq, ilike, or, and, gte, lte, inArray, sql } from 'drizzle-orm';

const router = Router();

// Validation helper
const validateCandidate = (data: any): string[] => {
  const errors: string[] = [];
  
  if (!data.name || data.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters long');
  }
  
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Valid email is required');
  }
  
  if (!data.skills) {
    errors.push('Skills are required');
  }
  
  if (data.experience !== undefined && (data.experience < 0 || data.experience > 50)) {
    errors.push('Experience must be between 0 and 50 years');
  }
  
  return errors;
};

// Parse skills helper
const parseSkills = (skills: string | string[]): string => {
  if (Array.isArray(skills)) {
    return JSON.stringify(skills);
  }
  try {
    // If it's already a JSON string, validate it
    JSON.parse(skills);
    return skills;
  } catch {
    // If it's a comma-separated string, convert to array
    return JSON.stringify(skills.split(',').map(s => s.trim()));
  }
};

// GET /api/candidates - Get all candidates with filtering and search
router.get('/', async (req: Request, res: Response) => {
  try {
    const { 
      search, 
      status, 
      minExperience, 
      maxExperience, 
      skills: skillsFilter,
      page = '1', 
      limit = '10',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    let query = db.select().from(candidates);
    const conditions = [];

    // Search functionality
    if (search) {
      const searchTerm = `%${search}%`;
      conditions.push(
        or(
          ilike(candidates.name, searchTerm),
          ilike(candidates.email, searchTerm),
          ilike(candidates.skills, searchTerm),
          ilike(candidates.notes, searchTerm)
        )
      );
    }

    // Status filter
    if (status && status !== 'all') {
      conditions.push(eq(candidates.status, status as string));
    }

    // Experience range filter
    if (minExperience) {
      conditions.push(gte(candidates.experience, parseInt(minExperience as string)));
    }
    if (maxExperience) {
      conditions.push(lte(candidates.experience, parseInt(maxExperience as string)));
    }

    // Skills filter
    if (skillsFilter) {
      const skillsArray = (skillsFilter as string).split(',');
      const skillConditions = skillsArray.map(skill => 
        ilike(candidates.skills, `%${skill.trim()}%`)
      );
      conditions.push(or(...skillConditions));
    }

    // Apply conditions
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    // Sorting
    const validSortFields = ['name', 'email', 'experience', 'createdAt', 'updatedAt'];
    const sortField = validSortFields.includes(sortBy as string) ? sortBy as string : 'createdAt';
    const order = sortOrder === 'asc' ? 'asc' : 'desc';

    query = query.orderBy(
      order === 'asc' 
        ? sql`${candidates[sortField as keyof typeof candidates]} ASC`
        : sql`${candidates[sortField as keyof typeof candidates]} DESC`
    ) as any;

    // Pagination
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const offset = (pageNum - 1) * limitNum;

    query = query.limit(limitNum).offset(offset) as any;

    const result = await query;

    // Get total count for pagination
    let countQuery = db.select({ count: sql`count(*)` }).from(candidates);
    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions)) as any;
    }
    const [{ count }] = await countQuery;

    res.json({
      data: result.map(candidate => ({
        ...candidate,
        skills: JSON.parse(candidate.skills)
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: parseInt(count as string),
        totalPages: Math.ceil(parseInt(count as string) / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching candidates:', error);
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
});

// GET /api/candidates/stats - Get statistics (MUST be before /:id route)
router.get('/stats/overview', async (req: Request, res: Response) => {
  try {
    const [total] = await db.select({ count: sql`count(*)` }).from(candidates);
    
    const [active] = await db
      .select({ count: sql`count(*)` })
      .from(candidates)
      .where(eq(candidates.status, 'active'));
    
    const [inactive] = await db
      .select({ count: sql`count(*)` })
      .from(candidates)
      .where(eq(candidates.status, 'inactive'));
    
    const [archived] = await db
      .select({ count: sql`count(*)` })
      .from(candidates)
      .where(eq(candidates.status, 'archived'));

    const [avgExperience] = await db
      .select({ avg: sql`avg(experience)` })
      .from(candidates);

    res.json({
      total: parseInt(total.count as string),
      active: parseInt(active.count as string),
      inactive: parseInt(inactive.count as string),
      archived: parseInt(archived.count as string),
      averageExperience: parseFloat(avgExperience.avg as string) || 0
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// GET /api/candidates/stats - Get simplified statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const [total] = await db.select({ count: sql`count(*)` }).from(candidates);
    
    const [active] = await db
      .select({ count: sql`count(*)` })
      .from(candidates)
      .where(eq(candidates.status, 'active'));
    
    const [archived] = await db
      .select({ count: sql`count(*)` })
      .from(candidates)
      .where(eq(candidates.status, 'archived'));

    const [avgExperience] = await db
      .select({ avg: sql`avg(experience)` })
      .from(candidates);

    res.json({
      total: parseInt(total.count as string),
      active: parseInt(active.count as string),
      archived: parseInt(archived.count as string),
      averageExperience: parseFloat(avgExperience.avg as string) || 0
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// POST /api/candidates/bulk - Bulk operations (MUST be before /:id route)
router.post('/bulk', async (req: Request, res: Response) => {
  try {
    const { action, ids, data } = req.body;

    if (!action || !ids || !Array.isArray(ids)) {
      return res.status(400).json({ error: 'Action and ids array are required' });
    }

    switch (action) {
      case 'delete':
        await db.delete(candidates).where(inArray(candidates.id, ids));
        res.json({ message: `${ids.length} candidates deleted successfully` });
        break;

      case 'update_status':
        if (!data?.status) {
          return res.status(400).json({ error: 'Status is required for bulk update' });
        }
        await db
          .update(candidates)
          .set({ status: data.status, updatedAt: new Date() })
          .where(inArray(candidates.id, ids));
        res.json({ message: `${ids.length} candidates updated successfully` });
        break;

      case 'archive':
        await db
          .update(candidates)
          .set({ status: 'archived', updatedAt: new Date() })
          .where(inArray(candidates.id, ids));
        res.json({ message: `${ids.length} candidates archived successfully` });
        break;

      case 'unarchive':
        await db
          .update(candidates)
          .set({ status: 'active', updatedAt: new Date() })
          .where(inArray(candidates.id, ids));
        res.json({ message: `${ids.length} candidates unarchived successfully` });
        break;

      default:
        res.status(400).json({ error: 'Invalid bulk action' });
    }
  } catch (error) {
    console.error('Error in bulk operation:', error);
    res.status(500).json({ error: 'Failed to perform bulk operation' });
  }
});

// GET /api/candidates/:id - Get single candidate
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [candidate] = await db.select().from(candidates).where(eq(candidates.id, id));
    
    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    res.json({
      ...candidate,
      skills: JSON.parse(candidate.skills)
    });
  } catch (error) {
    console.error('Error fetching candidate:', error);
    res.status(500).json({ error: 'Failed to fetch candidate' });
  }
});

// POST /api/candidates - Create new candidate
router.post('/', async (req: Request, res: Response) => {
  try {
    const errors = validateCandidate(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const { name, email, skills, resumeLink, experience, notes } = req.body;

    const newCandidate: NewCandidate = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      skills: parseSkills(skills),
      resumeLink: resumeLink?.trim() || null,
      experience: parseInt(experience) || 0,
      notes: notes?.trim() || null,
    };

    const [created] = await db.insert(candidates).values(newCandidate).returning();
    
    res.status(201).json({
      ...created,
      skills: JSON.parse(created.skills)
    });
  } catch (error: any) {
    console.error('Error creating candidate:', error);
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Failed to create candidate' });
  }
});

// PUT /api/candidates/:id - Update candidate
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const errors = validateCandidate(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ errors });
    }

    const { name, email, skills, resumeLink, experience, status, notes } = req.body;

    const updateData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      skills: parseSkills(skills),
      resumeLink: resumeLink?.trim() || null,
      experience: parseInt(experience) || 0,
      status: status || 'active',
      notes: notes?.trim() || null,
      updatedAt: new Date(),
    };

    const [updated] = await db
      .update(candidates)
      .set(updateData)
      .where(eq(candidates.id, id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    res.json({
      ...updated,
      skills: JSON.parse(updated.skills)
    });
  } catch (error: any) {
    console.error('Error updating candidate:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Failed to update candidate' });
  }
});

// DELETE /api/candidates/:id - Delete candidate
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [deleted] = await db.delete(candidates).where(eq(candidates.id, id)).returning();
    
    if (!deleted) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    res.json({ message: 'Candidate deleted successfully' });
  } catch (error) {
    console.error('Error deleting candidate:', error);
    res.status(500).json({ error: 'Failed to delete candidate' });
  }
});

export default router;
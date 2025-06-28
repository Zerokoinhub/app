const Course = require('../models/Course');

// Add a new course (Admin only)
exports.addCourse = async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Course name is required' });
    }

    // Check if course already exists
    const existingCourse = await Course.findOne({ name });
    if (existingCourse) {
      return res.status(409).json({ message: 'Course with this name already exists' });
    }

    const course = new Course({ name });
    await course.save();

    res.status(201).json({ 
      message: 'Course added successfully',
      course: {
        id: course._id,
        name: course.name,
        createdAt: course.createdAt
      }
    });
  } catch (error) {
    console.error('Add course error:', error.message);
    res.status(500).json({ message: 'Error adding course', error: error.message });
  }
};

// Get all course names (Public)
exports.getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find({ isActive: true }).select('courseName').sort({ createdAt: -1 });
    res.status(200).json({ 
      courseNames: courses.map(course => course.courseName)
    });
  } catch (error) {
    console.error('Get courses error:', error.message);
    res.status(500).json({ message: 'Error fetching courses', error: error.message });
  }
};

// Get course details by name (Public)
exports.getCourseDetailsByName = async (req, res) => {
  try {
    const { courseName } = req.params;
    const course = await Course.findOne({ courseName: { $regex: courseName, $options: 'i' }, isActive: true });

    if (!course) {
      return res.status(404).json({ message: 'Course not found or not active' });
    }

    res.status(200).json({ course });
  } catch (error) {
    console.error('Get course details error:', error.message);
    res.status(500).json({ message: 'Error fetching course details', error: error.message });
  }
};

// Delete a course (Admin only)
exports.deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;
    
    const course = await Course.findByIdAndDelete(id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.status(200).json({ message: 'Course deleted successfully' });
  } catch (error) {
    console.error('Delete course error:', error.message);
    res.status(500).json({ message: 'Error deleting course', error: error.message });
  }
};

// Add sample courses for testing (Admin only)
exports.addSampleCourses = async (req, res) => {
  try {
    const sampleCourses = [
      { name: 'JavaScript Programming' },
      { name: 'Python Development' },
      { name: 'Web Development' },
      { name: 'Data Science' },
      { name: 'Mobile App Development' }
    ];

    const addedCourses = [];
    
    for (const courseData of sampleCourses) {
      const existingCourse = await Course.findOne({ name: courseData.name });
      if (!existingCourse) {
        const course = new Course(courseData);
        await course.save();
        addedCourses.push({
          id: course._id,
          name: course.name,
          createdAt: course.createdAt
        });
      }
    }

    res.status(201).json({ 
      message: 'Sample courses added successfully',
      addedCourses,
      totalAdded: addedCourses.length
    });
  } catch (error) {
    console.error('Add sample courses error:', error.message);
    res.status(500).json({ message: 'Error adding sample courses', error: error.message });
  }
};

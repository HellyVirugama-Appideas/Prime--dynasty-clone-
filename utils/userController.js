// const fs = require('fs');
// const createCsvWriter = require('csv-writer').createObjectCsvWriter;

// const User = require('../../models/userModel');
// const AppliedJob = require('../../models/appliedJobModel');
// const Message = require('../../models/messageModel');

// exports.getAllUsers = async (req, res) => {
//   try {
//     const users = await User.find().populate('jobTitle jobSkill').sort('-_id');

//     res.render('user', { users });
//   } catch (error) {
//     req.flash('red', error.message);
//     res.redirect('/');
//   }
// };

// exports.viewUser = async (req, res) => {
//   try {
//     const user = await User.findById(req.params.id).populate(
//       'jobTitle jobSkill'
//     );

//     if (!user) {
//       req.flash('red', 'User not found!');
//       return res.redirect('/user');
//     }

//     res.render('user_view', { user });
//   } catch (error) {
//     if (error.name === 'CastError') req.flash('red', 'User not found!');
//     else req.flash('red', error.message);
//     res.redirect('/user');
//   }
// };

// exports.getDeleteUser = async (req, res) => {
//   try {
//     await Promise.all([
//       User.findByIdAndDelete(req.params.id),
//       AppliedJob.deleteOne({ user_id: req.params.id }),
//     ]);

//     req.flash('green', 'User deleted successfully.');
//     res.redirect('/user');
//   } catch (error) {
//     if (error.name === 'CastError' || error.name === 'TypeError')
//       req.flash('red', 'User not found!');
//     else req.flash('red', error.message);
//     res.redirect('/user');
//   }
// };

// exports.getAllMessages = async (req, res) => {
//   try {
//     const msgs = await Message.find().sort('-_id');
//     res.render('message', { msgs });
//   } catch (error) {
//     console.log(error);
//     req.flash('red', error.message);
//     res.redirect('/');
//   }
// };

// exports.viewMessages = async (req, res) => {
//   try {
//     const message = await Message.findById(req.params.id);
//     if (!message) {
//       req.flash('red', 'Message not found!');
//       return res.redirect('/message');
//     }

//     res.render('message_view', { message });
//   } catch (error) {
//     if (error.name === 'CastError') req.flash('red', 'Message not found!');
//     else req.flash('red', error.message);
//     res.redirect('/message');
//   }
// };

// exports.getDeleteMessages = async (req, res) => {
//   try {
//     await Message.findByIdAndDelete(req.params.id);

//     req.flash('green', 'Message deleted successfully.');
//     res.redirect('/message');
//   } catch (error) {
//     if (error.name === 'CastError' || error.name === 'TypeError')
//       req.flash('red', 'Message not found!');
//     else req.flash('red', error.message);
//     res.redirect('/message');
//   }
// };

// exports.exportUsers = async (req, res) => {
//   try {
//     const users = await User.find().populate('jobTitle');

//     const csvWriter = createCsvWriter({
//       path: 'users.csv',
//       header: [
//         { id: 'name', title: 'Name' },
//         { id: 'email', title: 'Email' },
//         { id: 'phone', title: 'Phone' },
//         { id: 'resumeAvailability', title: 'Resume Status' },
//         { id: 'jobTitle', title: 'Job Title' },
//         { id: 'experience', title: 'Experience' },
//         { id: 'city', title: 'City' },
//         { id: 'date', title: 'Date' },
//       ],
//     });

//     // Separate users into two arrays based on resume availability
//     const pendingResumes = users.filter((user) => user.resumes.length === 0);
//     const availableResumes = users.filter((user) => user.resumes.length > 0);

//     // Concatenate the arrays to get the pending first, then available
//     const csvData = [...pendingResumes, ...availableResumes].map((user) => ({
//       name: user.name,
//       email: user.email,
//       phone: user.phone,
//       resumeAvailability:
//         user.resumes && user.resumes.length > 0 ? 'Available' : 'Pending',
//       jobTitle: user.jobTitle.map((x) => x.name).join(' | '),
//       experience: user.experience,
//       city: user.city,
//       date: user.date.toLocaleDateString('en-US'),
//     }));

//     await csvWriter.writeRecords(csvData);

//     res.setHeader('Content-Type', 'text/csv');
//     res.setHeader('Content-Disposition', 'attachment; filename=users.csv');

//     const fileStream = fs.createReadStream('users.csv');
//     fileStream.pipe(res);
//   } catch (error) {
//     req.flash('red', error.message);
//     res.redirect('/user');
//   }
// };



// const fs = require('fs');
// const createCsvWriter = require('csv-writer').createObjectCsvWriter;

// const User = require('../../models/userModel');
// const AppliedJob = require('../../models/appliedJobModel');
// const Message = require('../../models/messageModel');

// exports.getAllUsers = async (req, res) => {
//   try {
//     const { search, experience, city } = req.query;
//     let query = {};

//     if (search) {
//       query.$or = [
//         { name: { $regex: search, $options: 'i' } },
//         { email: { $regex: search, $options: 'i' } },
//         { phone: { $regex: search, $options: 'i' } },
//       ];
//     }

//     if (experience && experience !== '') {
//       if (experience === 'Fresher') {
//         query.experience = 'Fresher';
//       } else {
//         query.experience = { $regex: experience, $options: 'i' };
//       }
//     }

//     if (city && city !== '') {
//       query.city = { $regex: city, $options: 'i' };
//     }

//     const users = await User.find(query).populate('jobTitle jobSkill').sort('-_id');

//     res.render('user', { users, query: req.query });
//   } catch (error) {
//     req.flash('red', error.message);
//     res.redirect('/');
//   }
// };

// exports.viewUser = async (req, res) => {
//   try {
//     const user = await User.findById(req.params.id).populate(
//       'jobTitle jobSkill'
//     );

//     if (!user) {
//       req.flash('red', 'User not found!');
//       return res.redirect('/user');
//     }

//     res.render('user_view', { user });
//   } catch (error) {
//     if (error.name === 'CastError') req.flash('red', 'User not found!');
//     else req.flash('red', error.message);
//     res.redirect('/user');
//   }
// };

// exports.getDeleteUser = async (req, res) => {
//   try {
//     await Promise.all([
//       User.findByIdAndDelete(req.params.id),
//       AppliedJob.deleteOne({ user_id: req.params.id }),
//     ]);

//     req.flash('green', 'User deleted successfully.');
//     res.redirect('/user');
//   } catch (error) {
//     if (error.name === 'CastError' || error.name === 'TypeError')
//       req.flash('red', 'User not found!');
//     else req.flash('red', error.message);
//     res.redirect('/user');
//   }
// };

// exports.getAllMessages = async (req, res) => {
//   try {
//     const msgs = await Message.find().sort('-_id');
//     res.render('message', { msgs });
//   } catch (error) {
//     console.log(error);
//     req.flash('red', error.message);
//     res.redirect('/');
//   }
// };

// exports.viewMessages = async (req, res) => {
//   try {
//     const message = await Message.findById(req.params.id);
//     if (!message) {
//       req.flash('red', 'Message not found!');
//       return res.redirect('/message');
//     }

//     res.render('message_view', { message });
//   } catch (error) {
//     if (error.name === 'CastError') req.flash('red', 'Message not found!');
//     else req.flash('red', error.message);
//     res.redirect('/message');
//   }
// };

// exports.getDeleteMessages = async (req, res) => {
//   try {
//     await Message.findByIdAndDelete(req.params.id);

//     req.flash('green', 'Message deleted successfully.');
//     res.redirect('/message');
//   } catch (error) {
//     if (error.name === 'CastError' || error.name === 'TypeError')
//       req.flash('red', 'Message not found!');
//     else req.flash('red', error.message);
//     res.redirect('/message');
//   }
// };

// exports.exportUsers = async (req, res) => {
//   try {
//     const users = await User.find().populate('jobTitle');

//     const csvWriter = createCsvWriter({
//       path: 'users.csv',
//       header: [
//         { id: 'name', title: 'Name' },
//         { id: 'email', title: 'Email' },
//         { id: 'phone', title: 'Phone' },
//         { id: 'resumeAvailability', title: 'Resume Status' },
//         { id: 'jobTitle', title: 'Job Title' },
//         { id: 'experience', title: 'Experience' },
//         { id: 'city', title: 'City' },
//         { id: 'date', title: 'Date' },
//       ],
//     });

//     // Separate users into two arrays based on resume availability
//     const pendingResumes = users.filter((user) => user.resumes.length === 0);
//     const availableResumes = users.filter((user) => user.resumes.length > 0);

//     // Concatenate the arrays to get the pending first, then available
//     const csvData = [...pendingResumes, ...availableResumes].map((user) => ({
//       name: user.name,
//       email: user.email,
//       phone: user.phone,
//       resumeAvailability:
//         user.resumes && user.resumes.length > 0 ? 'Available' : 'Pending',
//       jobTitle: user.jobTitle.map((x) => x.name).join(' | '),
//       experience: user.experience,
//       city: user.city,
//       date: user.date.toLocaleDateString('en-US'),
//     }));

//     await csvWriter.writeRecords(csvData);

//     res.setHeader('Content-Type', 'text/csv');
//     res.setHeader('Content-Disposition', 'attachment; filename=users.csv');

//     const fileStream = fs.createReadStream('users.csv');
//     fileStream.pipe(res);
//   } catch (error) {
//     req.flash('red', error.message);
//     res.redirect('/user');
//   }
// };




const fs = require('fs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const archiver = require("archiver");
const path = require('path');

const User = require('../../models/userModel');
const CVUpload = require('../../models/cvUploadModel');
const AppliedJob = require('../../models/appliedJobModel');
const Message = require('../../models/messageModel');

// ── Max CVs allowed in a single download ──
const MAX_CV_DOWNLOAD = 200;

exports.getAllUsers = async (req, res) => {
  try {
    const { search, experience, city, skill } = req.query;

    // ── Build base user query ──
    let userQuery = {};

    if (experience && experience !== '') {
      if (experience === 'Fresher') {
        userQuery.experience = 'Fresher';
      } else {
        userQuery.experience = { $regex: experience, $options: 'i' };
      }
    }

    if (city && city !== '') {
      userQuery.city = { $regex: city, $options: 'i' };
    }

    // ── Keyword search: search across ALL fields ──
    if (search && search.trim() !== '') {
      const s = search.trim();

      // Step 1: Search users directly by name, email, phone, city, country, skills, summary, cvJobTitles
      const directUserQuery = {
        ...userQuery,
        $or: [
          { name: { $regex: s, $options: 'i' } },
          { email: { $regex: s, $options: 'i' } },
          { phone: { $regex: s, $options: 'i' } },
          { city: { $regex: s, $options: 'i' } },
          { country: { $regex: s, $options: 'i' } },
          { experience: { $regex: s, $options: 'i' } },
          { cvJobTitles: { $regex: s, $options: 'i' } },
          { skills: { $regex: s, $options: 'i' } },
          { summary: { $regex: s, $options: 'i' } },
        ],
      };

      // Step 2: Search in CVUpload rawText, skills, jobTitles, summary
      const cvMatches = await CVUpload.find({
        $or: [
          { rawText: { $regex: s, $options: 'i' } },
          { skills: { $regex: s, $options: 'i' } },
          { jobTitles: { $regex: s, $options: 'i' } },
          { summary: { $regex: s, $options: 'i' } },
          { name: { $regex: s, $options: 'i' } },
        ],
      }).select('userId').lean();

      // Get unique user IDs from CV matches
      const cvUserIds = [...new Set(
        cvMatches
          .filter(cv => cv.userId)
          .map(cv => cv.userId.toString())
      )];

      // Step 3: Combine — users matched directly OR via CV rawText
      if (cvUserIds.length > 0) {
        userQuery = {
          ...userQuery,
          $or: [
            // Direct user field matches
            { name: { $regex: s, $options: 'i' } },
            { email: { $regex: s, $options: 'i' } },
            { phone: { $regex: s, $options: 'i' } },
            { city: { $regex: s, $options: 'i' } },
            { country: { $regex: s, $options: 'i' } },
            { experience: { $regex: s, $options: 'i' } },
            { cvJobTitles: { $regex: s, $options: 'i' } },
            { skills: { $regex: s, $options: 'i' } },
            { summary: { $regex: s, $options: 'i' } },
            // CV rawText match
            { _id: { $in: cvUserIds } },
          ],
        };
      } else {
        userQuery = directUserQuery;
      }
    }

    // ── Skill filter ──
    if (skill && skill.trim() !== '') {
      userQuery.skills = { $regex: skill.trim(), $options: 'i' };
    }

    const users = await User.find(userQuery).populate('jobTitle jobSkill').sort('-_id');

    res.render('user', { users, query: req.query });
  } catch (error) {
    req.flash('red', error.message);
    res.redirect('/');
  }
};

exports.viewUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('jobTitle jobSkill');

    if (!user) {
      req.flash('red', 'User not found!');
      return res.redirect('/user');
    }

    res.render('user_view', { user });
  } catch (error) {
    if (error.name === 'CastError') req.flash('red', 'User not found!');
    else req.flash('red', error.message);
    res.redirect('/user');
  }
};

exports.getDeleteUser = async (req, res) => {
  try {
    await Promise.all([
      User.findByIdAndDelete(req.params.id),
      AppliedJob.deleteOne({ user_id: req.params.id }),
    ]);

    req.flash('green', 'User deleted successfully.');
    res.redirect('/user');
  } catch (error) {
    if (error.name === 'CastError' || error.name === 'TypeError')
      req.flash('red', 'User not found!');
    else req.flash('red', error.message);
    res.redirect('/user');
  }
};

exports.getAllMessages = async (req, res) => {
  try {
    const msgs = await Message.find().sort('-_id');
    res.render('message', { msgs });
  } catch (error) {
    console.log(error);
    req.flash('red', error.message);
    res.redirect('/');
  }
};

exports.viewMessages = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) {
      req.flash('red', 'Message not found!');
      return res.redirect('/message');
    }
    res.render('message_view', { message });
  } catch (error) {
    if (error.name === 'CastError') req.flash('red', 'Message not found!');
    else req.flash('red', error.message);
    res.redirect('/message');
  }
};

exports.getDeleteMessages = async (req, res) => {
  try {
    await Message.findByIdAndDelete(req.params.id);
    req.flash('green', 'Message deleted successfully.');
    res.redirect('/message');
  } catch (error) {
    if (error.name === 'CastError' || error.name === 'TypeError')
      req.flash('red', 'Message not found!');
    else req.flash('red', error.message);
    res.redirect('/message');
  }
};

// exports.exportUsers = async (req, res) => {
//   try {
//     const users = await User.find().populate('jobTitle');

//     const csvWriter = createCsvWriter({
//       path: 'users.csv',
//       header: [
//         { id: 'name',              title: 'Name' },
//         { id: 'email',             title: 'Email' },
//         { id: 'phone',             title: 'Phone' },
//         { id: 'resumeAvailability',title: 'Resume Status' },
//         { id: 'jobTitle',          title: 'Job Title' },
//         { id: 'experience',        title: 'Experience' },
//         { id: 'city',              title: 'City' },
//         { id: 'country',           title: 'Country' },
//         { id: 'skills',            title: 'Skills' },
//         { id: 'date',              title: 'Date' },
//       ],
//     });

//     const pendingResumes   = users.filter(u => u.resumes.length === 0);
//     const availableResumes = users.filter(u => u.resumes.length > 0);

//     const csvData = [...pendingResumes, ...availableResumes].map(user => ({
//       name:   user.name,
//       email:  (user.email && user.email.startsWith('cv.') && user.email.includes('@cv-upload.com')) ? '' : user.email,
//       phone:  user.phone || '',
//       resumeAvailability: user.resumes && user.resumes.length > 0 ? 'Available' : 'Pending',
//       jobTitle: user.jobTitle && user.jobTitle.length > 0
//         ? user.jobTitle.map(x => x.name).join(' | ')
//         : (user.cvJobTitles && user.cvJobTitles.length > 0 ? user.cvJobTitles.join(' | ') : ''),
//       experience: user.experience || '',
//       city:       user.city || '',
//       country:    user.country || '',
//       skills:     user.skills && user.skills.length > 0 ? user.skills.join(', ') : '',
//       date:       user.date.toLocaleDateString('en-US'),
//     }));

//     await csvWriter.writeRecords(csvData);

//     res.setHeader('Content-Type', 'text/csv');
//     res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
//     fs.createReadStream('users.csv').pipe(res);
//   } catch (error) {
//     req.flash('red', error.message);
//     res.redirect('/user');
//   }
// };

// exports.exportUsers = async (req, res) => {
//   try {
//     const users = await User.find().populate('jobTitle');

//     // Fetch CV data for resume links
//     const allCVs = await CVUpload.find().select('userId filePath').lean();
//     const cvByUser = {};
//     allCVs.forEach(cv => {
//       if (cv.userId) cvByUser[cv.userId.toString()] = cv.filePath;
//     });

//     const csvWriter = createCsvWriter({
//       path: 'users.csv',
//       header: [
//         { id: 'name',              title: 'Name' },
//         { id: 'email',             title: 'Email' },
//         { id: 'phone',             title: 'Phone' },
//         { id: 'resumeAvailability',title: 'Resume Status' },
//         { id: 'resumeLink',        title: 'Resume Link' },   // ← NEW
//         { id: 'jobTitle',          title: 'Job Title' },
//         { id: 'experience',        title: 'Experience' },
//         { id: 'city',              title: 'City' },
//         { id: 'country',           title: 'Country' },
//         { id: 'skills',            title: 'Skills' },
//         { id: 'date',              title: 'Date' },          // ← FIXED format
//       ],
//     });

//     const pendingResumes   = users.filter(u => u.resumes.length === 0);
//     const availableResumes = users.filter(u => u.resumes.length > 0);

//     const baseUrl = `${req.protocol}://${req.get('host')}`;

//     const csvData = [...pendingResumes, ...availableResumes].map(user => {
//       const userId = user._id.toString();

//       // Resume link: prefer user.resumes[0], fallback to CVUpload filePath
//       let resumeLink = '';
//       if (user.resumes && user.resumes.length > 0) {
//         const rp = user.resumes[0];
//         resumeLink = baseUrl + (rp.startsWith('/') ? rp : '/' + rp);
//       } else if (cvByUser[userId]) {
//         resumeLink = baseUrl + cvByUser[userId];
//       }

//       return {
//         name:   user.name,
//         email:  (user.email && user.email.startsWith('cv.') && user.email.includes('@cv-upload.com')) ? '' : user.email,
//         phone:  user.phone || '',
//         resumeAvailability: user.resumes && user.resumes.length > 0 ? 'Available' : 'Pending',
//         resumeLink,
//         jobTitle: user.jobTitle && user.jobTitle.length > 0
//           ? user.jobTitle.map(x => x.name).join(' | ')
//           : (user.cvJobTitles && user.cvJobTitles.length > 0 ? user.cvJobTitles.join(' | ') : ''),
//         experience: user.experience || '',
//         city:       user.city || '',
//         country:    user.country || '',
//         skills:     user.skills && user.skills.length > 0 ? user.skills.join(', ') : '',
//         date:       formatDate(user.date),   // ← FIXED: DD/MM/YYYY string, no ####
//       };
//     });

//     await csvWriter.writeRecords(csvData);

//     res.setHeader('Content-Type', 'text/csv');
//     res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
//     fs.createReadStream('users.csv').pipe(res);
//   } catch (error) {
//     req.flash('red', error.message);
//     res.redirect('/user');
//   }
// };




// ── Helper: format date safely (fixes #### in CSV) ──
function formatDate(date) {
  if (!date) return '';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;   // DD/MM/YYYY — never causes #### in Excel
  } catch (e) {
    return '';
  }
}

// ── Helper: build resume public URL ──
function buildResumeUrl(req, filePath) {
  if (!filePath) return '';
  // filePath stored as /uploads/cvs/filename.pdf
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  return baseUrl + filePath;
}

exports.exportUsers = async (req, res) => {
  try {
    const users = await User.find().populate('jobTitle');

    // Fetch CV data for resume links
    const allCVs = await CVUpload.find().select('userId filePath').lean();
    const cvByUser = {};
    allCVs.forEach(cv => {
      if (cv.userId) cvByUser[cv.userId.toString()] = cv.filePath;
    });

    const csvWriter = createCsvWriter({
      path: 'users.csv',
      header: [
        { id: 'name', title: 'Name' },
        { id: 'email', title: 'Email' },
        { id: 'phone', title: 'Phone' },
        { id: 'resumeAvailability', title: 'Resume Status' },
        { id: 'resumeLink', title: 'Resume Link' },  
        { id: 'jobTitle', title: 'Job Title' },
        { id: 'experience', title: 'Experience' },
        { id: 'city', title: 'City' },
  	{ id: 'state', title: 'State' },
        { id: 'country', title: 'Country' },
        { id: 'skills', title: 'Skills' },
        { id: 'date', title: 'Date' },         
      ],
    });

    const pendingResumes = users.filter(u => u.resumes.length === 0);
    const availableResumes = users.filter(u => u.resumes.length > 0);

    const baseUrl = `${req.protocol}://${req.get('host')}`;

    const csvData = [...pendingResumes, ...availableResumes].map(user => {
      const userId = user._id.toString();

      // Resume link: prefer user.resumes[0], fallback to CVUpload filePath
      let resumeLink = '';
      if (user.resumes && user.resumes.length > 0) {
        // resumes[0] can be a string path OR an object with a path/url field
        const rp = user.resumes[0];
        // ✅ Naya — resumePdf field add ki
        let rpStr = '';
        if (typeof rp === 'string') {
          rpStr = rp;
        } else if (rp && typeof rp === 'object') {
          // User model mein field 'resumePdf' hai
          rpStr = rp.resumePdf || rp.path || rp.url || rp.filePath || rp.filename || '';
        }
        if (rpStr) {
          resumeLink = baseUrl + (rpStr.startsWith('/') ? rpStr : '/' + rpStr);
        }
      }
      if (!resumeLink && cvByUser[userId]) {
        resumeLink = baseUrl + cvByUser[userId];
      }

      return {
        name: user.name,
        email: (user.email && user.email.startsWith('cv.') && user.email.includes('@cv-upload.com')) ? '' : user.email,
        phone: user.phone ? `\t${user.phone}` : '',
        resumeAvailability: user.resumes && user.resumes.length > 0 ? 'Available' : 'Pending',
        resumeLink,
        jobTitle: user.jobTitle && user.jobTitle.length > 0
          ? user.jobTitle.map(x => x.name).join(' | ')
          : (user.cvJobTitles && user.cvJobTitles.length > 0 ? user.cvJobTitles.join(' | ') : ''),
        experience: user.experience || '',
        city: user.city || '',
	state:   user.state && user.state !== 'N/A' ? user.state : '', 
        country: user.country || '',
        skills: user.skills && user.skills.length > 0 ? user.skills.join(', ') : '',
        date: formatDate(user.date),   // ← FIXED: DD/MM/YYYY string, no ####
      };
    });

    await csvWriter.writeRecords(csvData);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
    fs.createReadStream('users.csv').pipe(res);
  } catch (error) {
    req.flash('red', error.message);
    res.redirect('/user');
  }
};

// ====================== DOWNLOAD ALL CVs (ZIP) ======================
// exports.downloadAllCVs = async (req, res) => {
//   try {
//     const CVUpload = require('../../models/cvUploadModel');
//     const archiver = require('archiver');
//     const path    = require('path');
//     const fs      = require('fs');

//     console.log('✅ Download All CVs route hit');

//     const allCVs = await CVUpload.find()
//       .populate('userId', 'name email')
//       .sort('-date');

//     console.log('Found', allCVs.length, 'CVs in database');

//     if (allCVs.length === 0) {
//       req.flash('red', 'No CVs found in database!');
//       return res.redirect('/user');
//     }

//     // Set response headers for ZIP download
//     const zipFileName = 'All_CVs_' + new Date().toISOString().slice(0, 10) + '.zip';
//     res.setHeader('Content-Type', 'application/zip');
//     res.setHeader('Content-Disposition', 'attachment; filename="' + zipFileName + '"');

//     const archive = archiver('zip', { zlib: { level: 6 } });

//     archive.on('error', function (err) {
//       console.error('Archiver error:', err);
//       if (!res.headersSent) {
//         res.status(500).send('Error creating ZIP: ' + err.message);
//       }
//     });

//     // Pipe archive directly to response (no temp file needed)
//     archive.pipe(res);

//     let added = 0;

//     for (const cv of allCVs) {
//       if (!cv.filePath) continue;

//       // cv.filePath = '/uploads/cvs/filename.pdf'
//       // Correct full path = project/public + cv.filePath
//       const fullPath = path.join(__dirname, '../../public', cv.filePath);

//       console.log('Checking:', fullPath, '| exists:', fs.existsSync(fullPath));

//       if (fs.existsSync(fullPath)) {
//         // Create a meaningful filename: CandidateName_originalFilename
//         const candidateName = (cv.name || (cv.userId && cv.userId.name) || 'Unknown')
//           .replace(/[^a-zA-Z0-9\s\-]/g, '')
//           .replace(/\s+/g, '_')
//           .slice(0, 40);

//         const ext      = path.extname(cv.filePath);
//         const baseName = path.basename(cv.filePath, ext);
//         const fileName = candidateName + '_' + baseName + ext;

//         archive.file(fullPath, { name: fileName });
//         added++;
//       } else {
//         console.log('File not found on disk:', fullPath);
//       }
//     }

//     console.log('Total files added to ZIP:', added);

//     if (added === 0) {
//       // Cannot send flash after headers, redirect won't work
//       // Just finalize with empty zip and log
//       console.log('WARNING: No CV files found on disk');
//     }

//     await archive.finalize();

//   } catch (error) {
//     console.error('Download All CVs Error:', error);
//     if (!res.headersSent) {
//       req.flash('red', 'Download failed: ' + error.message);
//       return res.redirect('/user');
//     }
//   }
// };

// ====================== DOWNLOAD SELECTED CVs (ZIP) ======================
// exports.downloadSelectedCVs = async (req, res) => {
//   try {
//     const CVUpload = require('../../models/cvUploadModel');
//     const archiver = require('archiver');
//     const path = require('path');
//     const fs = require('fs');

//     // Accept: POST body { userIds: ['id1','id2',...] }  OR  { cvIds: [...] }
//     let { userIds, cvIds, maxLimit } = req.body;

//     // Parse if sent as JSON string
//     if (typeof userIds === 'string') {
//       try { userIds = JSON.parse(userIds); } catch (e) { userIds = []; }
//     }
//     if (typeof cvIds === 'string') {
//       try { cvIds = JSON.parse(cvIds); } catch (e) { cvIds = []; }
//     }

//     userIds = Array.isArray(userIds) ? userIds : [];
//     cvIds = Array.isArray(cvIds) ? cvIds : [];

//     // Enforce max limit
//     const limit = Math.min(parseInt(maxLimit) || MAX_CV_DOWNLOAD, MAX_CV_DOWNLOAD);

//     if (userIds.length === 0 && cvIds.length === 0) {
//       return res.status(400).json({ error: 'No users/CVs selected.' });
//     }

//     // Build query
//     let query = {};
//     if (cvIds.length > 0) {
//       query._id = { $in: cvIds };
//     } else {
//       query.userId = { $in: userIds };
//     }

//     const selectedCVs = await CVUpload.find(query)
//       .populate('userId', 'name email')
//       .sort('-date')
//       .limit(limit);

//     if (selectedCVs.length === 0) {
//       return res.status(404).json({ error: 'No CV files found for selected users.' });
//     }

//     const zipFileName = `Selected_CVs_${selectedCVs.length}_${new Date().toISOString().slice(0, 10)}.zip`;
//     res.setHeader('Content-Type', 'application/zip');
//     res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);

//     const archive = archiver('zip', { zlib: { level: 6 } });

//     archive.on('error', function (err) {
//       console.error('Archiver error:', err);
//       if (!res.headersSent) res.status(500).send('Error creating ZIP: ' + err.message);
//     });

//     archive.pipe(res);

//     let added = 0;
//     for (const cv of selectedCVs) {
//       if (!cv.filePath) continue;
//       const fullPath = path.join(__dirname, '../../public', cv.filePath);
//       if (fs.existsSync(fullPath)) {
//         const candidateName = (cv.name || (cv.userId && cv.userId.name) || 'Unknown')
//           .replace(/[^a-zA-Z0-9\s\-]/g, '')
//           .replace(/\s+/g, '_')
//           .slice(0, 40);
//         const ext = path.extname(cv.filePath);
//         const baseName = path.basename(cv.filePath, ext);
//         const fileName = candidateName + '_' + baseName + ext;
//         archive.file(fullPath, { name: fileName });
//         added++;
//       }
//     }

//     console.log(`Selected ZIP: ${added} files added`);
//     await archive.finalize();

//   } catch (error) {
//     console.error('Download Selected CVs Error:', error);
//     if (!res.headersSent) {
//       res.status(500).json({ error: 'Download failed: ' + error.message });
//     }
//   }
// };


// // ====================== DOWNLOAD ALL CVs (ZIP) ======================
// exports.downloadAllCVs = async (req, res) => {
//   try {
//     console.log('✅ Download All CVs route hit');

//     // CVs user.resumes array mein hain, CVUpload collection mein nahi
//     const users = await User.find({ 'resumes.0': { $exists: true } })
//       .select('name email resumes')
//       .limit(MAX_CV_DOWNLOAD);

//     console.log('Found', users.length, 'users with resumes');

//     if (users.length === 0) {
//       req.flash('red', 'No CVs found!');
//       return res.redirect('/user');
//     }

//     const zipFileName = 'All_CVs_' + new Date().toISOString().slice(0, 10) + '.zip';
//     res.setHeader('Content-Type', 'application/zip');
//     res.setHeader('Content-Disposition', 'attachment; filename="' + zipFileName + '"');

//     const archive = archiver('zip', { zlib: { level: 6 } });

//     archive.on('error', function (err) {
//       console.error('Archiver error:', err);
//       if (!res.headersSent) res.status(500).send('Error creating ZIP: ' + err.message);
//     });

//     archive.pipe(res);

//     let added = 0;

//     for (const user of users) {
//       for (const resume of user.resumes) {
//         if (!resume.resumePdf) continue;

//         // resumePdf = '/uploads/cvs/filename.pdf'
//         const fullPath = path.join(__dirname, '../../public', resume.resumePdf);

//         if (fs.existsSync(fullPath)) {
//           const candidateName = (user.name || 'Unknown')
//             .replace(/[^a-zA-Z0-9\s\-]/g, '')
//             .replace(/\s+/g, '_')
//             .slice(0, 40);

//           const ext      = path.extname(resume.resumePdf);
//           const baseName = path.basename(resume.resumePdf, ext);
//           const fileName = candidateName + '_' + baseName + ext;

//           archive.file(fullPath, { name: fileName });
//           added++;
//         } else {
//           console.log('File not found on disk:', fullPath);
//         }
//       }
//     }

//     console.log('Total files added to ZIP:', added);

//     if (added === 0) {
//       console.log('WARNING: No CV files found on disk');
//     }

//     await archive.finalize();

//   } catch (error) {
//     console.error('Download All CVs Error:', error);
//     if (!res.headersSent) {
//       req.flash('red', 'Download failed: ' + error.message);
//       return res.redirect('/user');
//     }
//   }
// };


// // ====================== DOWNLOAD SELECTED CVs (ZIP) ======================
// exports.downloadSelectedCVs = async (req, res) => {
//   try {
//     let { userIds, maxLimit } = req.body;

//     if (typeof userIds === 'string') {
//       try { userIds = JSON.parse(userIds); } catch (e) { userIds = []; }
//     }

//     userIds = Array.isArray(userIds) ? userIds : [];

//     const limit = Math.min(parseInt(maxLimit) || MAX_CV_DOWNLOAD, MAX_CV_DOWNLOAD);

//     if (userIds.length === 0) {
//       return res.status(400).json({ error: 'No users selected.' });
//     }

//     // Selected users ke resumes fetch karo
//     const users = await User.find({
//       _id: { $in: userIds },
//       'resumes.0': { $exists: true }
//     })
//       .select('name email resumes')
//       .limit(limit);

//     if (users.length === 0) {
//       return res.status(404).json({ error: 'No CV files found for selected users.' });
//     }

//     const zipFileName = `Selected_CVs_${userIds.length}_${new Date().toISOString().slice(0, 10)}.zip`;
//     res.setHeader('Content-Type', 'application/zip');
//     res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);

//     const archive = archiver('zip', { zlib: { level: 6 } });

//     archive.on('error', function (err) {
//       console.error('Archiver error:', err);
//       if (!res.headersSent) res.status(500).send('Error creating ZIP: ' + err.message);
//     });

//     archive.pipe(res);

//     let added = 0;

//     for (const user of users) {
//       for (const resume of user.resumes) {
//         if (!resume.resumePdf) continue;

//         const fullPath = path.join(__dirname, '../../public', resume.resumePdf);

//         if (fs.existsSync(fullPath)) {
//           const candidateName = (user.name || 'Unknown')
//             .replace(/[^a-zA-Z0-9\s\-]/g, '')
//             .replace(/\s+/g, '_')
//             .slice(0, 40);

//           const ext      = path.extname(resume.resumePdf);
//           const baseName = path.basename(resume.resumePdf, ext);
//           const fileName = candidateName + '_' + baseName + ext;

//           archive.file(fullPath, { name: fileName });
//           added++;
//         } else {
//           console.log('File not found:', fullPath);
//         }
//       }
//     }

//     console.log(`Selected ZIP: ${added} files added`);
//     await archive.finalize();

//   } catch (error) {
//     console.error('Download Selected CVs Error:', error);
//     if (!res.headersSent) {
//       res.status(500).json({ error: 'Download failed: ' + error.message });
//     }
//   }
// };


// ====================== DOWNLOAD ALL CVs (ZIP) ======================
exports.downloadAllCVs = async (req, res) => {
  try {
    console.log('✅ Download All CVs route hit');

    // Total count check
    const totalUsers = await User.countDocuments({ 'resumes.0': { $exists: true } });
    console.log('Total users with resumes:', totalUsers);

    if (totalUsers === 0) {
      req.flash('red', 'No CVs found!');
      return res.redirect('/user');
    }

    const zipFileName = 'All_CVs_' + new Date().toISOString().slice(0, 10) + '.zip';
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="' + zipFileName + '"');

    const archive = archiver('zip', { zlib: { level: 6 } });

    archive.on('error', function (err) {
      console.error('Archiver error:', err);
      if (!res.headersSent) res.status(500).send('Error creating ZIP: ' + err.message);
    });

    archive.pipe(res);

    let added = 0;
    const BATCH_SIZE = 100;
    let skip = 0;

    // ── Batches mein saare users process karo (NO limit) ──
    while (true) {
      const users = await User.find({ 'resumes.0': { $exists: true } })
        .select('name email resumes')
        .skip(skip)
        .limit(BATCH_SIZE);

      if (users.length === 0) break;

      for (const user of users) {
        // ── Sirf pehla resume (working code jaisa) ──
        const resume = user.resumes[0];
        if (!resume || !resume.resumePdf) continue;

        const fullPath = path.join(__dirname, '../../public', resume.resumePdf);

        if (fs.existsSync(fullPath)) {
          const candidateName = (user.name || 'Unknown')
            .replace(/[^a-zA-Z0-9\s\-]/g, '')
            .replace(/\s+/g, '_')
            .slice(0, 40);

          const ext      = path.extname(resume.resumePdf);
          const baseName = path.basename(resume.resumePdf, ext);
          const fileName = candidateName + '_' + baseName + ext;

          archive.file(fullPath, { name: fileName });
          added++;
        } else {
          console.log('File not found on disk:', fullPath);
        }
      }

      skip += BATCH_SIZE;
      console.log(`Processed ${skip} users, added: ${added}`);

      if (users.length < BATCH_SIZE) break;
    }

    console.log('Total files added to ZIP:', added);

    if (added === 0) {
      console.log('WARNING: No CV files found on disk');
    }

    await archive.finalize();

  } catch (error) {
    console.error('Download All CVs Error:', error);
    if (!res.headersSent) {
      req.flash('red', 'Download failed: ' + error.message);
      return res.redirect('/user');
    }
  }
};


// ====================== DOWNLOAD SELECTED CVs (ZIP) ======================
exports.downloadSelectedCVs = async (req, res) => {
  try {
    let { userIds, maxLimit } = req.body;

    if (typeof userIds === 'string') {
      try { userIds = JSON.parse(userIds); } catch (e) { userIds = []; }
    }

    userIds = Array.isArray(userIds) ? userIds : [];

    const limit = Math.min(parseInt(maxLimit) || MAX_CV_DOWNLOAD, MAX_CV_DOWNLOAD);

    if (userIds.length === 0) {
      return res.status(400).json({ error: 'No users selected.' });
    }

    const users = await User.find({
      _id: { $in: userIds },
      'resumes.0': { $exists: true }
    })
      .select('name email resumes')
      .limit(limit);

    if (users.length === 0) {
      return res.status(404).json({ error: 'No CV files found for selected users.' });
    }

    const zipFileName = `Selected_CVs_${userIds.length}_${new Date().toISOString().slice(0, 10)}.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);

    const archive = archiver('zip', { zlib: { level: 6 } });

    archive.on('error', function (err) {
      console.error('Archiver error:', err);
      if (!res.headersSent) res.status(500).send('Error creating ZIP: ' + err.message);
    });

    archive.pipe(res);

    let added = 0;

    for (const user of users) {
      for (const resume of user.resumes) {
        if (!resume.resumePdf) continue;

        const fullPath = path.join(__dirname, '../../public', resume.resumePdf);

        if (fs.existsSync(fullPath)) {
          const candidateName = (user.name || 'Unknown')
            .replace(/[^a-zA-Z0-9\s\-]/g, '')
            .replace(/\s+/g, '_')
            .slice(0, 40);

          const ext      = path.extname(resume.resumePdf);
          const baseName = path.basename(resume.resumePdf, ext);
          const fileName = candidateName + '_' + baseName + ext;

          archive.file(fullPath, { name: fileName });
          added++;
        } else {
          console.log('File not found:', fullPath);
        }
      }
    }

    console.log(`Selected ZIP: ${added} files added`);
    await archive.finalize();

  } catch (error) {
    console.error('Download Selected CVs Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Download failed: ' + error.message });
    }
  }
};

// ====================== IMPORT USERS FROM CSV ======================
exports.importUsersFromCSV = async (req, res) => {
  try {
    if (!req.file) {
      req.flash('red', 'Please upload a CSV file.');
      return res.redirect('/user');
    }

    const results = [];
    const filePath = req.file.path;

    // CSV parse karo
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => results.push(row))
        .on('end', resolve)
        .on('error', reject);
    });

    // Temp file delete karo
    try { fs.unlinkSync(filePath); } catch (e) { }

    if (results.length === 0) {
      req.flash('red', 'CSV file is empty or invalid.');
      return res.redirect('/user');
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const row of results) {
      try {
        // CSV headers ke naam normalize karo (case-insensitive)
        const name = (row['Name'] || row['name'] || '').toString().trim();
        const email = (row['Email'] || row['email'] || '').toString().trim().toLowerCase();
        const phone = (row['Phone'] || row['phone'] || '').toString().trim();
        const experience = (row['Experience'] || row['experience'] || '').toString().trim();
        const city = (row['City'] || row['city'] || '').toString().trim();
        const country = (row['Country'] || row['country'] || '').toString().trim();
        const jobTitle = (row['Job Title'] || row['job_title'] || row['jobTitle'] || '').toString().trim();
        const skills = (row['Skills'] || row['skills'] || '').toString().trim();

        if (!name) { skipped++; continue; } // Name mandatory hai

        // Skills string to array
        const skillsArr = skills
          ? skills.split(',').map(s => s.trim()).filter(Boolean)
          : [];

        // Job titles array
        const jobTitlesArr = jobTitle
          ? jobTitle.split('|').map(t => t.trim()).filter(Boolean)
          : [];

        if (email && !email.includes('@cv-upload.com')) {
          // Email hai — existing user check karo
          const existingUser = await User.findOne({ email });

          if (existingUser) {
            // Update existing user — sirf empty fields fill karo
            if (!existingUser.phone && phone) existingUser.phone = phone;
            if ((!existingUser.experience || existingUser.experience === 'Fresher') && experience)
              existingUser.experience = experience;
            if ((!existingUser.city || existingUser.city === 'N/A') && city)
              existingUser.city = city;
            if ((!existingUser.country || existingUser.country === '' || existingUser.country === 'N/A') && country)
              existingUser.country = country;
            if (skillsArr.length > 0 && (!existingUser.skills || existingUser.skills.length === 0))
              existingUser.skills = skillsArr;
            if (jobTitlesArr.length > 0 && (!existingUser.cvJobTitles || existingUser.cvJobTitles.length === 0))
              existingUser.cvJobTitles = jobTitlesArr;
            await existingUser.save();
            updated++;
          } else {
            // Naya user banao
            const newUser = new User({
              name,
              email,
              phone: phone || '',
              experience: experience || 'Fresher',
              city: city || 'N/A',
              state: 'N/A',
              country: country || '',
              cvJobTitles: jobTitlesArr,
              skills: skillsArr,
              password: Math.random().toString(36).slice(-8) + 'Aa1!',
              resumes: [],
            });
            await newUser.save();
            created++;
          }
        } else {
          // Email nahi hai — hamesha naya user banao
          const placeholderEmail = 'cv.' + Date.now() + '.' + Math.random().toString(36).slice(-5) + '@cv-upload.com';
          const newUser = new User({
            name,
            email: placeholderEmail,
            phone: phone || '',
            experience: experience || 'Fresher',
            city: city || 'N/A',
            state: 'N/A',
            country: country || '',
            cvJobTitles: jobTitlesArr,
            skills: skillsArr,
            password: Math.random().toString(36).slice(-8) + 'Aa1!',
            resumes: [],
          });
          await newUser.save();
          created++;
        }
      } catch (e) {
        console.log('Row error:', e.message, row);
        skipped++;
      }
    }

    req.flash('green', `CSV Import done! Created: ${created}, Updated: ${updated}, Skipped: ${skipped}`);
    res.redirect('/user');

  } catch (error) {
    console.error('CSV Import Error:', error);
    req.flash('red', 'Import failed: ' + error.message);
    res.redirect('/user');
  }
};

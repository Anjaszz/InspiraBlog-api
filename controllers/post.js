const { File, Category, Post } = require("../models");
const { signedUrl } = require("../utils/awsS3"); // Pastikan Anda sudah mengimpor signedUrl
const addPost = async (req, res, next) => {
  try {
    const { title, desc, file, category } = req.body;
    const { _id } = req.user;

    if (file) {
      const isFileExist = await File.findById(file);
      if (!isFileExist) {
        res.code = 404;
        throw new Error("File not found");
      }
    }

    const isCategoryExist = await Category.findById(category);
    if (!isCategoryExist) {
      res.code = 404;
      throw new Error("Category not found");
    }

    const newPost = new Post({
      title,
      desc,
      file,
      category,
      updatedBy: _id,
    });
    await newPost.save();

    res
      .status(201)
      .json({ code: 201, status: true, message: "Post added successfully" });
  } catch (error) {
    next(error);
  }
};

const updatePost = async (req, res, next) => {
  try {
    const { title, desc, file, category } = req.body;
    const { id } = req.params;
    const { _id } = req.user;

    if (file) {
      const isFileExist = await File.findById(file);
      if (!isFileExist) {
        res.code = 404;
        throw new Error("File not found");
      }
    }

    if (category) {
      const isCategoryExist = await Category.findById(category);
      if (!isCategoryExist) {
        res.code = 404;
        throw new Error("Category not found");
      }
    }

    const post = await Post.findById(id);
    if (!post) {
      res.code = 404;
      throw new Error("Post not found");
    }

    post.title = title ? title : post.title;
    post.desc = desc;
    post.file = file;
    post.category = category ? category : post.category;
    post.updatedBy = _id;

    await post.save();

    res.status(200).json({
      code: 200,
      status: true,
      message: "Post updated succesfully",
      data: { post },
    });
  } catch (error) {
    next(error);
  }
};

const deletePost = async (req, res, next) => {
  try {
    const { id } = req.params;

    const post = await Post.findById(id);
    if (!post) {
      res.code = 404;
      throw new Error("Post not found");
    }

    await Post.findByIdAndDelete(id);

    res
      .status(200)
      .json({ code: 200, status: true, message: "Post deleted successfully" });
  } catch (error) {
    next(error);
  }
};

const getPosts = async (req, res, next) => {
  try {
    const { page, size, q, category } = req.query;
    const { _id } = req.user;  // Mengambil ID user yang sedang login

    const pageNumber = parseInt(page) || 1;
    const sizeNumber = parseInt(size) || 10;
    let query = { updatedBy: _id }; // Tambahkan filter berdasarkan user yang login

    if (q) {
      const search = new RegExp(q, "i");

      query = {
        ...query,
        $or: [{ title: search }],
      };
    }

    if (category) {
      query = { ...query, category };
    }

    const total = await Post.countDocuments(query);
    const pages = Math.ceil(total / sizeNumber);

    const posts = await Post.find(query)
      .populate("file")
      .populate("category")
      .populate("updatedBy", "-password -verificationCode -forgotPasswordCode")
      .sort({ _id: -1 })
      .skip((pageNumber - 1) * sizeNumber)
      .limit(sizeNumber);

    res.status(200).json({
      code: 200,
      status: true,
      message: "Get post list successfully",
      data: { posts, total, pages },
    });
  } catch (error) {
    next(error);
  }
};

const getAllPosts = async (req, res, next) => {
  try {
    const { page = 1, size = 5, q, category } = req.query; // Default size to 5
    const pageNumber = parseInt(page);
    const sizeNumber = parseInt(size);

    let query = {};

    if (q) {
      const search = new RegExp(q, "i");
      query = {
        ...query,
        $or: [{ title: search }],
      };
    }

    if (category) {
      query = { ...query, category };
    }

    const total = await Post.countDocuments(query);
    const pages = Math.ceil(total / sizeNumber);

    let posts = await Post.find(query)
      .populate("file")  // Populasi data file
      .populate("category")
      .populate("updatedBy", "-password -verificationCode -forgotPasswordCode")
      .sort({ _id: -1 })
      .skip((pageNumber - 1) * sizeNumber)
      .limit(sizeNumber);

    // Loop melalui setiap post dan tambahkan URL gambar jika ada
    posts = await Promise.all(
      posts.map(async (post) => {
        if (post.file && post.file.key) {
          const imageUrl = await signedUrl(post.file.key);
          return { ...post.toObject(), imageUrl }; // Tambahkan imageUrl ke object post
        }
        return post.toObject();
      })
    );

    res.status(200).json({
      code: 200,
      status: true,
      message: "Get all posts successfully",
      data: { posts, total, pages },
    });
  } catch (error) {
    next(error);
  }
};


const getAllPost = async (req, res, next) => {
  try {
    const { id } = req.params;

    const post = await Post.findById(id)
      .populate("file")
      .populate("category")
      .populate("updatedBy", "-password -verificationCode -forgotPasswordCode");

    if (!post) {
      res.code = 404;
      throw new Error("Post not found or you don't have access");
    }

    res.status(200).json({
      code: 200,
      status: true,
      message: "Get post successfully",
      data: { post },
    });
  } catch (error) {
    next(error);
  }
};

const getPost = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { _id } = req.user; 

    const post = await Post.findOne({ _id: id, updatedBy: _id })  
      .populate("file")
      .populate("category")
      .populate("updatedBy", "-password -verificationCode -forgotPasswordCode");

    if (!post) {
      res.code = 404;
      throw new Error("Post not found or you don't have access");
    }

    res.status(200).json({
      code: 200,
      status: true,
      message: "Get post successfully",
      data: { post },
    });
  } catch (error) {
    next(error);
  }
};


module.exports = { addPost, updatePost, deletePost, getPosts, getPost,getAllPosts,getAllPost };

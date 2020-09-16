/*
 * @Descripttion: gulp入口文件
 * @version: 1.0
 * @Author: SongXiao
 * @Date: 2020-09-09 23:58:21
 * @LastEditTime: 2020-09-16 21:35:52
 */
/**
 * 步骤：
 * 1. 初始化项目yarn
 * 2. 安装gulp：yarn add gulp
 * 3. 新建gulpfile.js入口文件
 * 4. 安装 yarn add gulp-sass(需要配置node-sass的淘宝镜像源)
 * 5. 读取写入样式文件并编译
 * 6. 安装 yarn add gulp-babel @babel/core @babel/preset-env
 * 7. 读取写入js脚本文件并编译
 * 8. 安装模版引擎 yarn add gulp-swig 转换插件
 * 9. 使用data作为模版的数据源进行编译置入
 * 10. parallel将三个项目同时进行
 * 11. 安装 yarn add gulp-imagemin 图片转换
 * 12. 图片字体转换
 * 13. 将public文件写入
 * 14. 安装yarn add del
 * 15. 文件清除，使用series先清除文件再进行文件编译
 * 16. 安装yarn add gulp-load-plugins 自动引入gulp插件
 * 17. 安装yarn add browser-sync 热更新开发服务器
 * 18. 文件修改时，浏览器自动更新
 * 19. 监听dist文件修改时，浏览器自动更新
 * 20. 监听src文件变化watch, 需要额外将swig选项中的cache设置为false
 * 21. 构建过程优化，在浏览器运行时不需要去压缩图片以及字体，只需要读取src中的文件就可以
 * 22. 在server之前需要进行build的操作
 * 23. 将files修改成bs.reload，用流的方式推送到页面
 * 24. 安装yarn add gulp-useref 文件构建（html中含有构建注释）
 * 25. 安装yarn add gulp-htmlmin gulp-uglify gulp-clean-css，对HTML、CSS、JavaScript文件进行压缩处理
 * 26. 安装yarn add gulp-if 对文件流进行类型判断
 * 27. 优化：对文件进行压缩操作的时候，读取和写入是同一个文件，会出现问题
 * 28. 重构目录结构，因为html,js,css在编译之后还需要useref以及压缩操作，所以需要中间文件夹temp
 * 29. 将导出的任务放到package.json中的script
 * 30. 封装自动化构建工作流
 * 31. 抽取data
 * 32. 尝试本地命令
 * 33. 抽取文件路径写进配置
 * 34. 将将要构建的项目中的gulpfile.js去掉，将此命令完全包装
 * 35. 找到文件下的node_modules的bin文件下的gulp.md
 */
// src读取路径，dest写入操作
const { src, dest, parallel, series, watch } = require('gulp');
const del = require('del');
const loadPlugins = require('gulp-load-plugins');
const plugins = loadPlugins();

// const sass = require('gulp-sass');
// const babel = require('gulp-babel');
// const swig = require('gulp-swig');
// const imagemin = require('gulp-imagemin');
const browserSync = require('browser-sync');

const bs = browserSync.create();
const cwd = process.cwd();
let config = {
    // default config
    build: {
        src: 'src',
        dist: 'dist',
        temp: 'temp',
        public: 'public',
        paths: {
            styles: 'assets/styles/*.scss',
            scripts: 'assets/scripts/*.js',
            pages: '*.html',
            images: 'assets/images/**',
            fonts: 'assets/fonts/**'
        }
    }
}

try {
    let loadConfig = require(`${cwd}/pages.config.js`);
    config = Object.assign({}, config, loadConfig)
} catch (e) {

}

// 清除文件
const clean = () => {
    return del([config.build.dist, config.build.temp]);
}

// 样式文件
const style = () => {
    // 读取scss文件，并且保证有相同的文件结构
    return src(config.build.paths.styles, { base: config.build.src, cwd: config.build.src })
        // 将scss文件编译成css文件
        // 会将_开头的文件忽略，被认为是私有scss文件
        // outputStyle将css完全展开
        .pipe(plugins.sass({ outputStyle: 'expanded' }))
        .pipe(dest(config.build.temp))
        .pipe(bs.reload({ stream: true }))
}

// 脚本文件
const script = () => {
    return src(config.build.paths.scripts, { base: config.build.src, cwd: config.build.src })
        // 整体特性的整体打包
        .pipe(plugins.babel({ presets: [require('@babel/preset-env')] }))
        .pipe(dest(config.build.temp))
        .pipe(bs.reload({ stream: true }))
}

// 模版文件
const page = () => {
    return src(config.build.paths.pages, { base: config.build.src, cwd: config.build.src })
        .pipe(plugins.swig(
            {
                data: config.data,
                // 很重要，因为swig模版引擎缓存会导致页面不会变化，所以需要额外将swig选项中的cache设置为false
                defaults: {
                    cache: false
                }
            }
        ))
        .pipe(dest(config.build.temp))
        .pipe(bs.reload({ stream: true }))
}

// 图片字体文件
const image = () => {
    return src(config.build.paths.images, { base: config.build.src, cwd: config.build.src })
        .pipe(plugins.imagemin())
        .pipe(dest(config.build.dist))
}
const font = () => {
    return src(config.build.paths.fonts, { base: config.build.src, cwd: config.build.src })
        .pipe(plugins.imagemin())
        .pipe(dest(config.build.dist))
}

// public下文件
const extra = () => {
    return src('**', { base: config.build.public, cwd: config.build.public })
        .pipe(dest(config.build.dist))
}

// 开发环境下浏览器预览
const devServe = () => {
    watch(config.build.paths.styles, { cwd: config.build.src }, style);
    watch(config.build.paths.scripts, { cwd: config.build.src }, script);
    watch(config.build.paths.pages, { cwd: config.build.src }, page);
    // 在开发过程中，压缩文件没有很大意义
    // watch('src/assets/images/**', image);
    // watch('src/assets/fonts/**', font);
    // watch('public/**', extra);
    // 当图片字体文件发现变化时
    watch([
        config.build.paths.images,
        config.build.paths.fonts
    ], { cwd: config.build.src }, bs.reload)

    watch('**', { cwd: config.build.public }, bs.reload);

    bs.init({
        // 服务器提示
        notify: false,
        // 端口号
        port: 2080,
        // 是否启动浏览器
        // open: false,
        // 监听文件变化，使浏览器修改
        // files: 'dist/**', // 修改成bs.reload
        server: {
            // 查找文件顺序
            baseDir: [config.build.temp, config.build.dist, config.build.public],
            // 优先于baseDir
            routes: {
                '/node_modules': 'node_modules',
                // '/public': 'public'
            }
        }
    })
}

// 生产环境下浏览器预览
const prodServe = () => {
    bs.init({
        notify: false,
        port: 2080,
        server: {
            baseDir: [config.build.dist],
        }
    }) 
}

const useref = () => {
    return src(config.build.paths.pages, { base: config.build.temp, cwd: config.build.src })
        .pipe(plugins.useref({ searchPath: [config.build.temp, '.'] }))
        // html js css
        .pipe(plugins.if(/\.js$/, plugins.uglify()))
        .pipe(plugins.if(/\.css$/, plugins.cleanCss()))
        // removeComments 删除html中的注释
        .pipe(plugins.if(/\.html$/, plugins.htmlmin({
            collapseWhitespace: true,
            minifyCSS: true,
            minifyJS: true,
            removeComments: true
        })))
        .pipe(dest(config.build.dist))
}

// 文件的编译
const compile = parallel(style, script, page);

// 上线之前执行的任务
const build = series(
    clean,
    parallel(
        series(compile, useref),
        image,
        font,
        extra
    )
);

const serve = series(compile, devServe);
const start = series(build, prodServe);

module.exports = {
    clean,
    compile,
    build,
    serve,
    start
}
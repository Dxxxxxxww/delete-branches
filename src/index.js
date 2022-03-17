const inquirer = require("inquirer");
const shell = require("shelljs");

/**
 * @author: dxw
 * @date: 2021/12/29 3:48 下午
 * @description: 批量删除分支
 */
const run = async () => {
    try {
        // ask branches prefix
        const { prefix, owner, includeOrigin } = await inquirer.prompt([
            {
                type: "input", // 输入方式
                name: "prefix", // 问题返回值的 key
                message: "Branch prefix please.", // 问题
            },
            {
                type: "input", // 输入方式
                name: "owner", // 问题返回值的 key
                message: 'Owner please ( if dont have owner, input "n" ).', // 问题
            },
            {
                type: "confirm",
                name: "includeOrigin",
                message: "Do you wanna delete origin branches ?",
            },
        ]);
        // 通过前缀查询分支
        const branches = shell.exec(`git branch -a | grep ${prefix}`, {
            silent: true,
        }).stdout;
        // get local, remote branch list
        const [localArr, remoteArr] = split(stringToArray(branches));
        const [localStr, remoteStr] = getStringBranches(
            [localArr, remoteArr],
            owner,
            includeOrigin
        );
        // 如果没有 local 就返回
        // 如果 includeOrigin 为 true ， remoteStr 必须有
        //                      false ，remoteStr 无所谓
        const hasRemote = includeOrigin && !remoteStr;
        if (!localStr || hasRemote) {
            return;
        }
        // make sure you wanna delete branches
        const { sure } = await inquirer.prompt([
            {
                type: "confirm",
                name: "sure",
                message:
                    "Are you sure you want to delete all selected branches ?",
            },
        ]);
        // make sure
        if (!sure) {
            return shell.echo("Quit");
        }
        // delete remote branches
        if (includeOrigin) {
            shell.exec(`git push origin --delete ${remoteStr}`);
        }
        // delete local branches
        shell.exec(`git branch -D ${localStr}`);
        shell.echo("Delete success !!!");
    } catch (e) {
        shell.echo(e);
    }
};

const stringToArray = (str) =>
    str
        .trim()
        .split("\n")
        .map((item) => item.trim());
// 分割本地和远端分支
const split = (arr) => {
    const l = [],
        r = [];
    arr.forEach((b) => {
        if (b.includes("remotes/")) {
            r.push(b);
        } else {
            l.push(b);
        }
    });

    return [l, r];
};
// 过滤自己的分支
const filterOwner = (arr, owner) => arr.filter((item) => item.includes(owner));
// 格式化本地分支
const formatLocal = (arr) => arr.join(" ");
// 格式化远端分支
const formatRemote = (arr) => arr.join(" ").replace(/remotes\/origin\//g, "");
// 增加换行
const shifter = (arr) => arr.split(" ").join(" \n ");
// 获取字符串形式的分支名
const getStringBranches = (branches, owner, includeOrigin) => {
    const [localArr, remoteArr] = branches;
    if (owner === "n") {
        owner = "";
    }
    // get local branches
    const localStr = formatLocal(filterOwner(localArr, owner));
    // get remote branches
    const remoteStr = formatRemote(filterOwner(remoteArr, owner));
    const result = [localStr, remoteStr];
    if (!localStr) {
        return warning("local");
    }
    if (!remoteStr && includeOrigin) {
        return warning("remote");
    }
    // log branches list
    result.forEach((branch, idx) => {
        const _map = ["Local", "Remote"];
        shell.echo(`${_map[idx]} branches: \n ${shifter(branch)}`);
    });

    return result;
};
// 警告信息
const warning = (key) => {
    shell.echo(`Warning: cannot find ${key} branches`);
    return undefined;
};

run().catch(console.log);

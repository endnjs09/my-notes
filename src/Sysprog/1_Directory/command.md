# 리눅스 주요 명령어 구현해보기

## 1. pwd — 현재 작업 디렉토리 경로 출력
> Print Working Directory. 현재 내가 위치한 디렉토리의 절대 경로를 출력함  
> 핵심 함수: `getcwd()`

| 옵션 | 설명 |
|------|------|
| (없음) | 옵션 거의 사용 안 함 |

```C
#include "sysprog.h"

int main(int argc, char *argv[]) {
    char *cwd = getcwd(NULL, 0);

    if(cwd) 
        printf("Current Path: %s\n", cwd);
    free(cwd);
}
```
---
<br><br>


## 2. ls — 디렉토리 내용 목록 출력
> List. 현재 또는 지정한 디렉토리 안의 파일/디렉토리 목록을 출력함  
> **핵심 함수**: `opendir()` `readdir()` `stat()`

| 옵션 | 설명 |
|------|------|
| `-l` | 권한, 소유자, 크기, 수정일 등 상세 정보 출력 |
| `-a` | 숨김 파일(`.`으로 시작)까지 포함해서 출력 |
| `-i` | inode 번호 함께 출력 |
| `-s` | 파일 크기 함께 출력 |
| `-r` | 하위 디렉토리까지 재귀적으로 탐색 (BFS) |
```C
#include "sysprog.h"

int ls_l = 0, ls_a = 0, ls_i = 0, ls_s = 0, ls_r = 0;

void check(int n, char *m[]) {
    for (int i = 1; i < n; i++) {
        if (strcmp(m[i], "-l") == 0) ls_l = 1;
        if (strcmp(m[i], "-a") == 0) ls_a = 1;
        if (strcmp(m[i], "-i") == 0) ls_i = 1;
        if (strcmp(m[i], "-s") == 0) ls_s = 1;
        if (strcmp(m[i], "-r") == 0) ls_r = 1;
    }
}

void print_perm(struct stat *statbuf) {
    char perm[11];

    if      (S_ISREG(statbuf->st_mode))  perm[0] = '-';
    else if (S_ISDIR(statbuf->st_mode))  perm[0] = 'd';
    else if (S_ISLNK(statbuf->st_mode))  perm[0] = 'l';
    else                                  perm[0] = '?';

    perm[1] = (statbuf->st_mode & S_IRUSR) ? 'r' : '-';
    perm[2] = (statbuf->st_mode & S_IWUSR) ? 'w' : '-';
    perm[3] = (statbuf->st_mode & S_IXUSR) ? 'x' : '-';
    perm[4] = (statbuf->st_mode & S_IRGRP) ? 'r' : '-';
    perm[5] = (statbuf->st_mode & S_IWGRP) ? 'w' : '-';
    perm[6] = (statbuf->st_mode & S_IXGRP) ? 'x' : '-';
    perm[7] = (statbuf->st_mode & S_IROTH) ? 'r' : '-';
    perm[8] = (statbuf->st_mode & S_IWOTH) ? 'w' : '-';
    perm[9] = (statbuf->st_mode & S_IXOTH) ? 'x' : '-';
    perm[10] = '\0';

    printf("%s ", perm);
}

void print_entry(struct dirent *dent, struct stat *statbuf) {
    if (ls_l == 1) {    // LS -l
        print_perm(statbuf);                            // 1. 권한

        printf("%d ", (int)statbuf->st_nlink);          // 2. 하드링크 수
    
        struct passwd *pw = getpwuid(statbuf->st_uid);
        struct group  *gr = getgrgid(statbuf->st_gid);
        printf("%s ", pw->pw_name);                     // 3. 사용자 이름
        printf("%s ", gr->gr_name);                     // 4. 그룹 이름

        printf("%d ", (int)statbuf->st_size);           // 5. 파일 크기
    
        struct tm *t = localtime(&statbuf->st_mtime);   
        char timebuf[64];
        strftime(timebuf, sizeof(timebuf), "%b %e %H:%M", t);
        printf("%s ", timebuf);                         // 6. 마지막 수정 시간

        printf("%s\n", dent->d_name);                   // 7. 파일 이름

    } else {    
        // LS -i
        if (ls_i == 1) 
            printf("%lu ", statbuf->st_ino);
        
        // LS -s
        if (ls_s == 1) 
            printf("%lld ", (long long)statbuf->st_size);
        printf("%s\n", dent->d_name);
    }
}

// LS -r
void LSR(char *start) {
    char queue[1024][2048];
    int front = 0, rear = 0;

    strcpy(queue[rear++], start);

    while (front < rear) {
        char curpath[2048];
        strcpy(curpath, queue[front++]);

        printf("\n%s\n", curpath);

        DIR *dp = opendir(curpath);
        if (dp == NULL) continue;

        struct dirent *dent;
        struct stat statbuf;

        while ((dent = readdir(dp)) != NULL) {
            if (ls_a == 0 && dent->d_name[0] == '.') continue;

            char fullpath[4096];
            snprintf(fullpath, sizeof(fullpath), "%s/%s", curpath, dent->d_name);

            stat(fullpath, &statbuf);
            print_entry(dent, &statbuf);

            // 하위 디렉토리면 큐에 추가 (.과 ..은 제외)
            if (S_ISDIR(statbuf.st_mode) 
                    && strcmp(dent->d_name, ".") != 0 
                    && strcmp(dent->d_name, "..") != 0) {
                strcpy(queue[rear++], fullpath);
            }
        }
        closedir(dp);
    }
}

int main(int argc, char *argv[]) {
    DIR *dp;
    struct dirent *dent;
    struct stat statbuf;

    check(argc, argv);

    if (ls_r == 1) {
        LSR(".");
        return 0;
    }

    dp = opendir(".");
    if (dp == NULL) {
        perror("opendir error");
        return 1;
    }

    while ((dent = readdir(dp)) != NULL) {
        if (ls_a == 0 && dent->d_name[0] == '.') continue;

        stat(dent->d_name, &statbuf);
        print_entry(dent, &statbuf);
    }

    closedir(dp);
    return 0;
}
```
---
<br><br>

## 3. cp — 파일 복사
> Copy. 원본 파일을 읽어 새로운 파일로 내용을 그대로 복사함  
> **핵심 함수**: `open()` `read()` `write()` 

| 옵션 | 설명 |
|------|------|
| `기본`| `cp a.txt b.txt`|
| `-r` | 디렉토리 재귀 복사 `cp -r dir1 dir2`|
```C
#include "sysprog.h"
#define BUFSIZE 1024
#define PATHSIZE 4096 

char src_queue[1024][PATHSIZE];
char dst_queue[1024][PATHSIZE];
void cpr(char *src, char *dst) {
    int front = 0, rear = 0;

    mkdir(dst, 0755);  // dst 디렉토리 생성

    strcpy(src_queue[rear], src);
    strcpy(dst_queue[rear], dst);
    rear++;

    while (front < rear) {
        char curpath[PATHSIZE], dstpath[PATHSIZE];
        strcpy(curpath, src_queue[front]);
        strcpy(dstpath, dst_queue[front]);
        front++;

        DIR *dp = opendir(curpath);
        if (dp == NULL) continue;

        struct dirent *dent;
        struct stat statbuf;

        while ((dent = readdir(dp))) {
            if (dent->d_name[0] == '.') continue;

            char src_full[PATHSIZE + 256], dst_full[PATHSIZE + 256];
            snprintf(src_full, sizeof(src_full), "%s/%s", curpath, dent->d_name);
            snprintf(dst_full, sizeof(dst_full), "%s/%s", dstpath, dent->d_name);
            stat(src_full, &statbuf);

            if (S_ISDIR(statbuf.st_mode)) {
                mkdir(dst_full, 0755);  // 디렉토리 생성
                strcpy(src_queue[rear], src_full);
                strcpy(dst_queue[rear], dst_full);
                rear++;
            } else {
                // 파일 복사
                int fd1 = open(src_full, O_RDONLY);
                int fd2 = open(dst_full, O_WRONLY | O_CREAT | O_TRUNC, 0644);
                char buf[BUFSIZE];
                int n;
                while ((n = read(fd1, buf, BUFSIZE)) > 0) {
                    write(fd2, buf, n);
                }
                close(fd1);
                close(fd2);
            }
        }
        closedir(dp);
    }
}

int main(int argc, char *argv[]) {
    int fd, n, dst;
    char buf[BUFSIZE];

    if (argc < 3) {
        printf("Usage: CP [-r] source dest\n");
        exit(1);
    }
    int cp_r = 0;
    if (strcmp(argv[1], "-r") == 0 && argc < 4) {
        printf("Usage: CP [-r] source dest\n");
        exit(1);
    }
    if (strcmp(argv[1], "-r") == 0) cp_r = 1;

        
    // -r
    if (cp_r == 1) {
        cpr(argv[2], argv[3]);
    }
    else {
        fd = open(argv[1], O_RDONLY);   // 원본
        dst = open(argv[2], O_WRONLY | O_CREAT | O_TRUNC, 0644);   // 복제
        if (fd == -1 || dst == -1) {
            perror("open");
            exit(1);
        }

        while ((n = read(fd, buf, BUFSIZE))) {
            write(dst, buf, n);
        }
        close(fd);
        close(dst);
    }
}
```
---
<br><br>

## 4. mv — 파일 이동 / 이름 변경
> Move. 파일의 경로를 바꾸거나 이름을 변경함. 같은 파일시스템 내에서는 실제 데이터 이동 없이 경로 정보만 변경됨  
> **핵심 함수**: `rename()` 

| 옵션 | 설명 |
|------|------|
|`기본`| `mv a.txt b.txt`, `mv dir1 dir2`|
| `-f` | 대상 파일 존재해도 강제 덮어씀 |

---
<br><br>

## 5. rm — 파일 삭제
> Remove. 파일의 하드링크 수를 줄여 0이 되면 실제 데이터가 삭제됨  
> **핵심 함수**: `unlink()` `rmdir()`

| 옵션 | 설명 |
|------|------|
|`기본`| `rm a.txt` (파일삭제)|
| `-r` | 디렉토리와 하위 내용 재귀 삭제 `rm -r dir1`|
---
<br><br>

## 6. mkdir — 디렉토리 생성
> Make Directory. 새로운 디렉토리를 생성함  
> **핵심 함수**: `mkdir()`

| 옵션 | 설명 |
|------|------|
| `기본`| `mkdir dir1`|
| `-p` | 중간 경로 없어도 자동 생성. ex) `mkdir -p a/b/c` |
```C
#include "sysprog.h"

int main(int argc, char *argv[]) {
    struct stat statbuf;

    int mkdir_p = 0;
    if (argc < 2) {
        printf("Usage: MKDIR [-p] directory\n");
        exit(1);
    }
    if (strcmp(argv[1], "-p") == 0 && argc < 3) {
        printf("Usage: MKDIR -p directory\n");
        exit(1);
    }
    if (strcmp(argv[1], "-p") == 0) mkdir_p = 1;

    if (mkdir_p == 1) {     // mkdir -p a/b/c 라면
        char path[1024];    // 복사본 
        strcpy(path, argv[2]);  // 입력받은 경로(argv[2])를 복사

        char curpath[1024] = "";    // 누적용 (a -> a/b -> a/b/c)

        // "/" 기준으로 자름. token는 a, b, c 위치 가리키는 포인터
        char *token = strtok(path, "/");    

        while (token != NULL) {
            strcat(curpath, token);    

            if (stat(curpath, &statbuf) != 0) {  // 파일 정보 가져옴 0이면 이미 존재한다는 뜻
                mkdir(curpath, 0755);
            }
            strcat(curpath, "/");
            token = strtok(NULL, "/");      // 이전에 잘랐던 위치에서 이어서 자름 (b가 됨)
        }
    }
    else {
        if(mkdir(argv[1], 0755) == -1) {
            perror("mkdir");
            exit(1);
        }
    }
}
```
---
<br><br>

## 7. rmdir — 빈 디렉토리 삭제
> Remove Directory. 비어있는 디렉토리만 삭제 가능. 파일이 남아있으면 삭제 안 됨  
> **핵심 함수**: `rmdir()` 

| 옵션 | 설명 |
|------|------|
|`기본`| `rmdir dir1`|
| `-p` | 상위 디렉토리도 비어있으면 연쇄 삭제. ex) `rmdir -p a/b/c` |
```C
#include "sysprog.h"

int main(int argc, char *argv[]) {
    struct stat statbuf;

    if (argc < 2) {
        printf("Usage: RMDIR [-p] directory\n");
        exit(1);
    }

    int rmdir_p = 0;
    if (argv[1] != NULL && argc < 3) {
        printf("Usage: MKDIR -p directory\n");
        exit(1);
    }
    if (strcmp(argv[1], "-p") == 0) rmdir_p = 1; 


    if (rmdir_p == 1) {
        char *tokens[100], path[1024];
        int cnt = 0;
        strcpy(path, argv[2]);  // a/b/c

        char *token = strtok(path, "/");
        while (token != NULL) {
            tokens[cnt] = token;    // tokens[0] = a, tokens[1] = b, tokens[2] = c
            cnt++;
            token = strtok(NULL, "/");   
        }

        for (int i = cnt - 1; i >= 0; i--) {
            char curpath[1024] = "";
            for (int j = 0; j <= i; j++) {
                strcat(curpath, tokens[j]);
                if (j < i) strcat(curpath, "/");
            }
            if (rmdir(curpath) == -1) break;
        }


    }
    else {
        if (rmdir(argv[1]) == -1) {
            perror("rmdir\n");
            exit(1);
        }
    }
    return 0;
}
```
---
<br><br>


## 8. cat — 파일 내용 출력
> Concatenate. 파일 내용을 처음부터 끝까지 한번에 표준 출력으로 출력함  
> 핵심 함수: `open()` `read()` `write()`

| 옵션 | 설명 |
|------|------|
|`기본`| `cat a.txt`|
| `-n` | 각 줄 앞에 줄 번호 출력 `cat -n a.txt`|
```C
#include "sysprog.h"
#define BUFSIZE 1024

int main(int argc, char *argv[]) {
    char buf[BUFSIZE];  // 버퍼
    int fd, n;

    if (argc < 2) {
        printf("Usage: CAT [-n] directory\n");
        exit(1);
    }

    int cat_n = 0;
    if (strcmp(argv[1], "-n") == 0 && argc < 3) {
        printf("Usage: CAT -n directory\n");
        exit(1);
    }
    if (strcmp(argv[1], "-n") == 0) cat_n = 1; 


    if (cat_n == 1) {
        fd = open(argv[2], O_RDONLY);
        if (fd == -1) {
            perror("open");
            exit(1);
        }

        int cnt = 1, start = 1;
        // 파일(fd)에서 1바이트씩 읽어서 buf에 저장
        while ((n = read(fd, buf, 1)) > 0) {
            if (start == 1) {
                char numbuf[16];
                sprintf(numbuf, "%d ", cnt);    // numbuf에 저장
                write(1, numbuf, strlen(numbuf));
                start = 0;
            }
            write(1, buf, n);   
            if (buf[0] == '\n') {
                cnt++; // 줄바꿈 만나면 줄번호++
                start = 1;  // 다음 글자는 줄의 시작점
            }
        }
		close(fd);
    }
    else {
        fd = open(argv[1], O_RDONLY);
        if (fd == -1) {
            perror("open");
            exit(1);
        }

        // 파일(fd)에서 BUFSIZE만큼 읽어서 buf에 저장
        while ((n = read(fd, buf, BUFSIZE)) > 0) {
            write(1, buf, n);   // write로 한번에 출력
        }
		close(fd);
    }
}
```
---
<br><br>

## 9. chmod — 파일 권한 변경
> Change Mode. 파일이나 디렉토리의 읽기/쓰기/실행 권한을 변경함  
> 핵심 함수: `chmod()`

| 옵션/모드 | 설명 |
|-----------|------|
| `-R` | 하위 파일 전체에 재귀 적용 |
| `755` | 숫자 모드. 소유자(rwx), 그룹(r-x), 기타(r-x) |
| `+x` | 기호 모드. 현재 권한에 실행 권한 추가 |
| `u` `g` `o` | 각각 소유자(user), 그룹(group), 기타(other) 대상 지정 |
```C
#include "sysprog.h"

int main(int argc, char *argv[]) {
    if (argc < 3) {
        printf("Usage: CHMOD mode file\n");
        exit(1);
    }

    // "755" → 0755 (8진수 변환)
    int mode = strtol(argv[1], NULL, 8);  

    if (chmod(argv[2], mode) == -1) {
        perror("chmod");
        exit(1);
    }

    return 0;
}
```
---
<br><br>

## 10. grep — 파일에서 문자열 검색
> Global Regular Expression Print. 파일에서 특정 문자열이 포함된 줄을 찾아 출력함  
> 핵심 함수: `open()` `read()` + `strstr()`

| 옵션 | 설명 |
|------|------|
| `-i` | 대소문자 구분 없이 검색 |
| `-r` | 하위 디렉토리까지 재귀 탐색 |
| `-n` | 검색된 줄 번호 함께 출력 |
```C
#include "sysprog.h"
#define BUFSIZE 1024
#define PATHSIZE 8192

void grep_file(char *file, char *keyword) {
    int fd = open(file, O_RDONLY);
    if (fd == -1) { 
        perror("open"); 
        return; 
    }

    char buf[BUFSIZE];
    char ch;
    int idx = 0;

    while (read(fd, &ch, 1) > 0) {
        if (ch == '\n') {
            buf[idx] = '\0';        
            if (strstr(buf, keyword) != NULL) {
                write(1, file, strlen(file));
                write(1, " : ", 3);
                write(1, buf, idx);
                write(1, "\n", 1);
            }
            idx = 0;
        } 
        else {
            if (idx < BUFSIZE - 1) {
                buf[idx++] = ch;
            }
        }
    }
    close(fd);
}


char queue[1024][PATHSIZE];

// BFS로 디렉토리 재귀 탐색
void bfs(char *dir, char *keyword) {
    // front: 다음에 꺼낼 위치, rear: 다음에 넣을 위치 
    int front = 0, rear = 0;
    if (rear < 1024) 
        strcpy(queue[rear++], dir);  // dir(.) push
    
    while (front < rear) {
        char curpath[PATHSIZE];

        // curpath에 dir(.) 복사 후 pop
        strcpy(curpath, queue[front++]);  

        // 현재 위치(.) 폴더 열기
        DIR *dp = opendir(curpath);     
        if (dp == NULL) continue;

        struct dirent *dent;
        struct stat statbuf;

        while ((dent = readdir(dp))) {
            if (dent->d_name[0] == '.') continue;

            // 경로 합치기 (하위 디렉터리로 들어가기 위함)
            // fullpath에 curpath + "/" + d_name(dir1) 담음
            // fulpath는 ./dir1 이 됨
            char fullpath[PATHSIZE + 256];
            snprintf(fullpath, sizeof(fullpath), "%s/%s", curpath, dent->d_name);
            
            // ./dir1 파일 정보 검색
            if (stat(fullpath, &statbuf) == -1) continue;

            if (S_ISDIR(statbuf.st_mode)) { // 디렉터리면
                if (rear < 1024) { 
                    strcpy(queue[rear++], fullpath);    
                }
            } 
            else {  // 파일 이면
                grep_file(fullpath, keyword);
            }
        }
        closedir(dp);
    }
}

int main(int argc, char *argv[]) {
    char buf[BUFSIZE];

    if (argc < 3) {
        printf("Usage: GREP [-n|-r] keyword filename\n");
        exit(1);
    }

    int grep_n = 0, grep_r = 0;
    if (strcmp(argv[1], "-n") == 0 || strcmp(argv[1], "-r") == 0) {
        if (argc < 4) {
            printf("Usage: GREP [-n|-r] keyword filename\n");
            exit(1);
        }
        if (strcmp(argv[1], "-n") == 0) grep_n = 1;
        if (strcmp(argv[1], "-r") == 0) grep_r = 1;
    }

    if (grep_n == 1) {
        int fd = open(argv[3], O_RDONLY);
        if (fd == -1) { perror("open"); exit(1); }

        char ch;
        int idx = 0, cnt = 1;

        while (read(fd, &ch, 1) > 0) {
            if (ch == '\n') {
                buf[idx] = '\0';
                if (strstr(buf, argv[2]) != NULL) {
                    char numbuf[32];
                    int nlen = sprintf(numbuf, "%d: ", cnt);
                    write(1, numbuf, nlen);
                    write(1, buf, idx);
                    write(1, "\n", 1);
                }
                idx = 0;
                cnt++;
            } 
            else {
                if (idx < PATHSIZE - 1) buf[idx++] = ch;
            }
        }
        close(fd);
    }
    else if (grep_r == 1) {
        bfs(argv[3], argv[2]);
    }
    else {
        grep_file(argv[2], argv[1]);
    }
}
```
---
-i는 아직 구현 안함..
<br><br>


## 공통 헤더파일 (sysprog.h)

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <fcntl.h>
#include <dirent.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <pwd.h>
#include <grp.h>
#include <time.h>
#include <termios.h>
```
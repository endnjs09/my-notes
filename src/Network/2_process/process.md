# 프로세스란?
프로세스는 실행중인 프로그램을 의미함. 프로그램은 일종의 파일로서 하드디스크 등의 보조 메모리에 저장된 상태지만,
프로세스는 이 파일이 실행되기 위해서 메인 메모리에 로드되고 운영체제에 의해 CPU의 서비스를 받을 수 있는 상태를 말함.

![Image](/img/process.png)

프로세스는 사용자 모드 or 커널 모드 중 하나에서 실행됨
- i++ 같은 간단한 일반 연산은 사용자 모드에서 실행
- 하드디스크에서 데이터를 읽는 read() 함수 같은 경우는 커널에게 동작을 요청하고 커널이 하드디스크에서 데이터를 읽게 됨.

프로세스가 실행되려면 일정한 메모리를 배정 받아 사용하여야 하며, 이 메모리 영역을 프로세스 이미지라고 부름. 어떤 프로세스가 사용하는 메모리 영역은 다른 프로세스가 접근할 수는 없음.

|메모리 영역|내용|
|--------|----------|
|스택(stack)|현재 호출되어 실행중인 함수의 코드와 환경 정보 저장. <br> 함수의 종료와 함께 할당된 메모리 영역이 사라짐.
|힙(heap)|malloc()으로 할당 받은 영역으로 함수가 리턴되어도 사라<br>지지않음
초기화 된 데이터 영역|int x = 3; 과 같이 초기값을 설정
초기화 안 된 데이터 영역|int a; 와 같이 초기값 지정 x
코드 영역|어셈블된 프로그램 코드

<br><br>

## fork() 함수
새로운 프로세스를 만들기 위해 사용함. fork()를 호출한 프로세스의 이미지를 복사하여 새로운 프로세스를 생성.
<br>
### 1. 부모 자식 프로세스
- 부모 프로세스: fork()를 호출한 프로세스. 이때 fork()의 리턴값은 자식 프로세스의 PID
- 자식 프로세스: fork()에 의해 생성된 프로세스
  
### 2. 프로세스의 공유
- 중요한 점은 부모와 자식 프로세스 변수를 서로 공유하지 않음
- 개설한 file descriptor는 프로세스 이미지 외부에 존재하므로 부모 자식 사이에 공유됨.
 
```C
#include <unistd.h>
#include <sys/types.h>

int global_var = 0;

int main() {
    pid_t pid;
    int local_var = 0;
    if((pid = fork() < 0)) {    
        // fork(): 현재 실행 중인 프로세스와 똑같은 복사본 생성 (부모 자식)
        printf("fork error\n");
        exit(0);
    }   
    else if (pid == 0) {  // 자식 프로세스 (pid = 0)
        global_var++;     // 부모의 변수와는 상관없이 별개로 작동함.
        local_var++;
        printf("CHILD - my pid = %d and parent's pid = %d\n", getpid(), getppid());
    }
    else {  // 부모 프로세스
        sleep(2);
        global_var += 5;  // 자식과는 상관없이 별개로 작동함
        local_var += 5;
        printf("PARENT - my pid = %d and child's pid = %d\n", getpid(), pid);
    }
    printf("\t global var: %d\n", global_var);
    printf("\t local var: %d\n", local_var);
}
```
<br><br>

### execl() 함수
프로세스가 다른 작업으로 전환할 때 사용하는 함수. 현재 실행 중인 프로세스의 이미지를 다른 이미지로 교체함.

```C
int execl(const char *path, const char *arg0, ..., (char *)0);
```
- *path: 실행할 프로그램의 전체 경로
- arg0: 관례적으로 프로그램의 이름을 적음 (argv[0]으로 쓰일 값)
- ...: 프로그램에 전달할 인자들
- (char *)0 또는 NULL: 인자가 끝났다는 것을 알리는 마침표
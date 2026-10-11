#include <Security/SecTask.h>

typedef void (*StrongroomReply)(void *context, const char *json);
void strongroom_invoke(const char *operation, const char *input, void *context, StrongroomReply reply);
